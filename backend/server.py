from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import logging
from datetime import datetime, timezone, timedelta, date
from typing import Annotated, List, Optional

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, EmailStr
from starlette.middleware.cors import CORSMiddleware

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc)

    def to_mongo(self):
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data


class User(BaseDocument):
    display_name: str
    email: str
    password_hash: Optional[str] = None
    created_at: str


class Habit(BaseDocument):
    owner_id: str
    name: str
    when_i_do_it: str = ""
    shared: bool = False
    completions: List[str] = []
    created_at: str


class Comment(BaseDocument):
    habit_id: str
    author_id: str
    author_name: str
    text: str
    created_at: str


class SignUpIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=200)


class SignInIn(BaseModel):
    email: EmailStr
    password: str


class HabitIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    when_i_do_it: str = Field(default="", max_length=2000)
    shared: bool = False


class TickIn(BaseModel):
    date: str
    done: bool


class CommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hash_password(p):
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p, h):
    return bcrypt.checkpw(p.encode(), h.encode())


def create_token(user_id, email):
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


def public_user(u: User):
    return {"id": u.id, "display_name": u.display_name, "email": u.email}


def auth_response(response: Response, user: User):
    token = create_token(user.id, user.email)
    response.set_cookie("access_token", token, httponly=True, secure=True, samesite="none",
                        max_age=30 * 86400, path="/")
    return {"user": public_user(user), "token": token}


async def get_current_user(request: Request) -> User:
    token = request.cookies.get("access_token")
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        doc = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(401, "Invalid token")
    if not doc:
        raise HTTPException(401, "User not found")
    return User.from_mongo(doc)


def days_done(h: Habit):
    return len(set(h.completions))


def current_streak(h: Habit):
    done = sorted(set(h.completions), reverse=True)
    if not done:
        return 0
    streak, day = 0, date.fromisoformat(done[0])
    s = set(done)
    while day.isoformat() in s:
        streak += 1
        day -= timedelta(days=1)
    return streak


async def habit_out(h: Habit, owner_name: Optional[str] = None):
    if owner_name is None:
        owner = await db.users.find_one({"_id": ObjectId(h.owner_id)}, {"display_name": 1})
        owner_name = owner["display_name"] if owner else "Unknown"
    return {"id": h.id, "name": h.name, "when_i_do_it": h.when_i_do_it, "shared": h.shared,
            "owner_id": h.owner_id, "owner_name": owner_name, "completions": sorted(set(h.completions)),
            "days_done": days_done(h), "current_streak": current_streak(h)}


async def load_visible_habit(habit_id: str, user: User) -> Habit:
    if not ObjectId.is_valid(habit_id):
        raise HTTPException(404, "Habit not found")
    doc = await db.habits.find_one({"_id": ObjectId(habit_id)})
    if not doc:
        raise HTTPException(404, "Habit not found")
    h = Habit.from_mongo(doc)
    if h.owner_id != user.id and not h.shared:
        raise HTTPException(404, "Habit not found")
    return h


@api.post("/auth/register")
async def register(body: SignUpIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "An account with this email already exists")
    user = User(display_name=body.display_name.strip(), email=email,
                password_hash=hash_password(body.password), created_at=now_iso())
    res = await db.users.insert_one(user.to_mongo())
    user.id = str(res.inserted_id)
    return auth_response(response, user)


@api.post("/auth/login")
async def login(body: SignInIn, response: Response):
    doc = await db.users.find_one({"email": body.email.lower()})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(401, "Incorrect email or password")
    return auth_response(response, User.from_mongo(doc))


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/", secure=True, samesite="none")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: User = Depends(get_current_user)):
    return public_user(user)


@api.get("/habits/mine")
async def my_habits(user: User = Depends(get_current_user)):
    docs = await db.habits.find({"owner_id": user.id}).sort("created_at", -1).to_list(1000)
    return [await habit_out(Habit.from_mongo(d), user.display_name) for d in docs]


@api.post("/habits")
async def add_habit(body: HabitIn, user: User = Depends(get_current_user)):
    h = Habit(owner_id=user.id, name=body.name.strip(), when_i_do_it=body.when_i_do_it.strip(),
              shared=body.shared, completions=[], created_at=now_iso())
    res = await db.habits.insert_one(h.to_mongo())
    h.id = str(res.inserted_id)
    return await habit_out(h, user.display_name)


@api.get("/habits/community")
async def community(user: User = Depends(get_current_user)):
    docs = await db.habits.find({"shared": True}).sort("created_at", -1).to_list(1000)
    return [await habit_out(Habit.from_mongo(d)) for d in docs]


@api.get("/habits/{habit_id}")
async def get_habit(habit_id: str, user: User = Depends(get_current_user)):
    return await habit_out(await load_visible_habit(habit_id, user))


@api.put("/habits/{habit_id}/ticks")
async def tick(habit_id: str, body: TickIn, user: User = Depends(get_current_user)):
    h = await load_visible_habit(habit_id, user)
    if h.owner_id != user.id:
        raise HTTPException(403, "Only the owner can change this habit")
    try:
        if not DATE_RE.match(body.date):
            raise ValueError
        date.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(400, "Date must be YYYY-MM-DD")
    op = "$addToSet" if body.done else "$pull"
    await db.habits.update_one({"_id": ObjectId(habit_id)}, {op: {"completions": body.date}})
    return await habit_out(await load_visible_habit(habit_id, user), user.display_name)


@api.get("/habits/{habit_id}/comments")
async def list_comments(habit_id: str, user: User = Depends(get_current_user)):
    await load_visible_habit(habit_id, user)
    docs = await db.comments.find({"habit_id": habit_id}).sort("created_at", 1).to_list(1000)
    return [Comment.from_mongo(d).model_dump() for d in docs]


@api.post("/habits/{habit_id}/comments")
async def post_comment(habit_id: str, body: CommentIn, user: User = Depends(get_current_user)):
    await load_visible_habit(habit_id, user)
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Comment cannot be empty")
    c = Comment(habit_id=habit_id, author_id=user.id, author_name=user.display_name,
                text=text, created_at=now_iso())
    res = await db.comments.insert_one(c.to_mongo())
    c.id = str(res.inserted_id)
    return c.model_dump()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ['CORS_ORIGINS'].split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.habits.create_index("owner_id")
    await db.habits.create_index("shared")
    await db.comments.create_index("habit_id")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
