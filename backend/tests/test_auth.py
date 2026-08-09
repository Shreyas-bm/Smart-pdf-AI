import sys
import os
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from app.main import app
from app.db.session import get_db
from app.db.models import Base

# Setup SQLite test database
TEST_DB_FILE = "test.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///./{TEST_DB_FILE}"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency override
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestAuthAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Remove old test DB if it exists
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass
        # Create all tables in the test database
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        # Drop all tables and clean up database file after tests
        Base.metadata.drop_all(bind=engine)
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass

    def test_01_signup_success(self):
        # Test registering a new user
        response = self.client.post(
            "/api/auth/signup",
            json={"email": "test@example.com", "password": "securepassword"}
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("session_token", data)
        self.assertIn("user", data)
        self.assertEqual(data["user"]["email"], "test@example.com")
        self.assertIn("id", data["user"])
        
        # Test cookie is set
        cookies = response.cookies
        self.assertIn("better-auth.session_token", cookies)

    def test_02_signup_duplicate_email(self):
        # Registering duplicate email should return HTTP 400
        response = self.client.post(
            "/api/auth/signup",
            json={"email": "test@example.com", "password": "anotherpassword"}
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data["detail"], "A user with this email address already exists.")

    def test_03_login_success(self):
        # Test logging in with correct credentials
        response = self.client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "securepassword"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("session_token", data)
        self.assertEqual(data["user"]["email"], "test@example.com")
        
        # Check cookie is set
        cookies = response.cookies
        self.assertIn("better-auth.session_token", cookies)

    def test_04_login_failure(self):
        # Test logging in with wrong password
        response = self.client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"}
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data["detail"], "Incorrect email or password.")

    def test_05_session_authenticated(self):
        # First login to get a session
        login_res = self.client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "securepassword"}
        )
        token = login_res.json()["session_token"]

        # Call session using Authorization header
        headers = {"Authorization": f"Bearer {token}"}
        response = self.client.get("/api/auth/session", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], "test@example.com")

        # Call session using Cookie
        self.client.cookies.clear()
        self.client.cookies.set("better-auth.session_token", token)
        response = self.client.get("/api/auth/session")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], "test@example.com")

    def test_06_session_unauthenticated(self):
        # Call session with no headers or cookies
        self.client.cookies.clear()
        response = self.client.get("/api/auth/session")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["email"], "local.user@smartpdf.ai")

    def test_07_oauth_mock_login(self):
        # Test oauth signup/login
        response = self.client.post(
            "/api/auth/oauth",
            json={"provider": "google", "id_token": "google_test_token_123@example.com"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("session_token", data)
        self.assertEqual(data["user"]["email"], "google_test_token_123@example.com")

    def test_08_logout(self):
        # Test logout clears cookies
        response = self.client.post("/api/auth/logout")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["detail"], "Successfully logged out.")
        
        # Verify the cookie value is deleted or empty
        cookie = response.cookies.get("better-auth.session_token")
        self.assertTrue(cookie is None or cookie == "")

if __name__ == "__main__":
    unittest.main()
