# Habit tracker API regression tests: auth, habits CRUD, ticks/streak, visibility, comments
import os
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


def _register(name):
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"display_name": name, "email": email, "password": "pass1234"})
    assert r.status_code == 200, r.text
    d = r.json()
    return {"email": email, "token": d["token"], "user": d["user"], "cookies": r.cookies,
            "h": {"Authorization": f"Bearer {d['token']}"}}


@pytest.fixture(scope="module")
def owner():
    return _register("TEST_Owner")


@pytest.fixture(scope="module")
def other():
    return _register("TEST_Other")


# Auth
class TestAuth:
    def test_register_sets_httponly_cookie(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={"display_name": "TEST_C", "email": email, "password": "pass1234"})
        assert r.status_code == 200
        sc = r.headers.get("set-cookie", "")
        assert "access_token=" in sc and "HttpOnly" in sc
        assert r.json()["user"]["display_name"] == "TEST_C"

    def test_duplicate_email(self, owner):
        r = requests.post(f"{API}/auth/register", json={"display_name": "x", "email": owner["email"], "password": "pass1234"})
        assert r.status_code == 400

    def test_login_ok_and_me(self, owner):
        r = requests.post(f"{API}/auth/login", json={"email": owner["email"].upper(), "password": "pass1234"})
        assert r.status_code == 200
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {r.json()['token']}"})
        assert me.status_code == 200 and me.json()["email"] == owner["email"]

    def test_login_wrong_password(self, owner):
        r = requests.post(f"{API}/auth/login", json={"email": owner["email"], "password": "wrong"})
        assert r.status_code == 401
        assert "detail" in r.json()

    def test_alice_login(self):
        r = requests.post(f"{API}/auth/login", json={"email": "alice@example.com", "password": "alice123"})
        assert r.status_code == 200

    def test_unauth(self):
        assert requests.get(f"{API}/habits/mine").status_code == 401

    def test_cookie_auth(self, owner):
        r = requests.get(f"{API}/auth/me", cookies={"access_token": owner["token"]})
        assert r.status_code == 200


# Habits, ticks, streak, visibility, comments
class TestHabits:
    def test_full_flow(self, owner, other):
        p = requests.post(f"{API}/habits", headers=owner["h"], json={"name": "TEST_private", "when_i_do_it": "morning"})
        assert p.status_code == 200 and p.json()["shared"] is False
        priv = p.json()["id"]
        s = requests.post(f"{API}/habits", headers=owner["h"], json={"name": "TEST_shared", "when_i_do_it": "night", "shared": True})
        assert s.status_code == 200 and s.json()["shared"] is True
        sh = s.json()["id"]

        mine = requests.get(f"{API}/habits/mine", headers=owner["h"]).json()
        assert {priv, sh} <= {h["id"] for h in mine}
        other_mine = requests.get(f"{API}/habits/mine", headers=other["h"]).json()
        assert not ({priv, sh} & {h["id"] for h in other_mine})

        comm = requests.get(f"{API}/habits/community", headers=other["h"]).json()
        ids = {h["id"]: h for h in comm}
        assert sh in ids and priv not in ids
        assert ids[sh]["owner_name"] == "TEST_Owner" and ids[sh]["when_i_do_it"] == "night"
        assert all(h["shared"] for h in comm)

        assert requests.get(f"{API}/habits/{priv}", headers=other["h"]).status_code == 404
        assert requests.get(f"{API}/habits/{sh}", headers=other["h"]).status_code == 200

        t = date.today()
        d = lambda n: (t - timedelta(days=n)).isoformat()
        url = f"{API}/habits/{sh}/ticks"
        for n in (0, 1, 4):
            r = requests.put(url, headers=owner["h"], json={"date": d(n), "done": True})
            assert r.status_code == 200
        assert r.json()["days_done"] == 3 and r.json()["current_streak"] == 2
        # idempotent tick
        r = requests.put(url, headers=owner["h"], json={"date": d(0), "done": True})
        assert r.json()["days_done"] == 3
        for n in (0, 1, 4):
            requests.put(url, headers=owner["h"], json={"date": d(n), "done": False})
        for n in (2, 3):
            r = requests.put(url, headers=owner["h"], json={"date": d(n), "done": True})
        assert r.json()["days_done"] == 2 and r.json()["current_streak"] == 2
        g = requests.get(f"{API}/habits/{sh}", headers=owner["h"]).json()
        assert g["completions"] == sorted([d(2), d(3)])

        # non-owner tick
        r = requests.put(url, headers=other["h"], json={"date": d(0), "done": True})
        assert r.status_code == 403
        r = requests.put(f"{API}/habits/{priv}/ticks", headers=other["h"], json={"date": d(0), "done": True})
        assert r.status_code == 404
        # bad date
        r = requests.put(url, headers=owner["h"], json={"date": "2026/01/01", "done": True})
        assert r.status_code == 400

        # comments
        c = requests.post(f"{API}/habits/{sh}/comments", headers=other["h"], json={"text": "TEST nice"})
        assert c.status_code == 200 and c.json()["author_name"] == "TEST_Other" and c.json()["id"]
        lst = requests.get(f"{API}/habits/{sh}/comments", headers=owner["h"]).json()
        assert any(x["text"] == "TEST nice" and x["author_name"] == "TEST_Other" for x in lst)
        assert all("_id" not in x for x in lst)
        assert requests.post(f"{API}/habits/{priv}/comments", headers=other["h"], json={"text": "x"}).status_code == 404
        assert requests.post(f"{API}/habits/{sh}/comments", headers=other["h"], json={"text": "   "}).status_code in (400, 422)

    def test_validation(self, owner):
        assert requests.post(f"{API}/habits", headers=owner["h"], json={"name": ""}).status_code == 422
        assert requests.get(f"{API}/habits/notanid", headers=owner["h"]).status_code == 404
