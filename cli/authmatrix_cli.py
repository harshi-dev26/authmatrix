"""AuthMatrix v2 interactive demo. Use only the published synthetic accounts."""
import base64
import hashlib
import hmac
import json
import struct
import time
import uuid
from dataclasses import dataclass
from getpass import getpass
from pathlib import Path

SEED = Path(__file__).resolve().parents[1] / "web" / "data" / "sample-data.json"


@dataclass(frozen=True)
class DemoUser:
    user_id: str
    email: str
    name: str
    role: str
    placeholder: str

    def matches(self, email, password):
        return self.email.casefold() == email.strip().casefold() and hmac.compare_digest(
            self.placeholder.encode(), ("educational-placeholder:" + password).encode()
        )


@dataclass
class Session:
    user: DemoUser
    session_id: str
    active: bool = True

    def permits_admin(self):
        return self.active and self.user.role == "admin"


class TotpVerifier:
    def __init__(self, record):
        secret = record["secret"].upper().rstrip("=")
        self.key = base64.b32decode(secret + "=" * (-len(secret) % 8))
        self.period = record["periodSeconds"]

    def code(self, timestamp=None):
        seconds = time.time() if timestamp is None else timestamp
        counter = struct.pack(">Q", int(seconds) // self.period)
        digest = hmac.new(self.key, counter, hashlib.sha1).digest()
        offset = digest[-1] & 15
        number = struct.unpack_from(">I", digest, offset)[0] & 0x7fffffff
        return f"{number % 1000000:06d}"

    def verify(self, value):
        digits = value.strip().replace(" ", "")
        return digits.isascii() and len(digits) == 6 and hmac.compare_digest(digits, self.code())


class AuthMatrixApp:
    def __init__(self, path=SEED):
        data = json.loads(path.read_text(encoding="utf-8"))
        self.users = [
            DemoUser(u["userId"], u["email"], u["displayName"], u["role"], u["passwordHash"])
            for u in data["users"]
        ]
        self.verifiers = {r["userId"]: TotpVerifier(r) for r in data["totpSecrets"]}
        self.session = None

    def login(self):
        self.session = None
        email = input("Demo email: ")
        password = getpass("Demo password: ")
        user = next((u for u in self.users if u.matches(email, password)), None)
        if not user:
            print("Invalid email or password.")
            return
        print(f"Select {user.name} in the mobile Authenticator.")
        if not self.verifiers[user.user_id].verify(input("Current six-digit code: ")):
            print("Verification failed. Check the account, code and device time.")
            return
        self.session = Session(user, str(uuid.uuid4()))
        print(f"Signed in as {user.name} ({user.role}). Session {self.session.session_id}")

    def run(self):
        print("AuthMatrix CLI · synthetic demo accounts only")
        for user in self.users:
            print(f"{user.role}: {user.email} / {user.placeholder.split(':', 1)[1]}")
        while True:
            choice = input("\n1 Sign in | 2 Test admin action | 3 Verify TOTP | 4 Log out | 0 Quit\n> ").strip()
            if choice == "0":
                return
            if choice == "1":
                self.login()
            elif choice not in ("2", "3", "4"):
                print("Choose a listed number.")
            elif not self.session or not self.session.active:
                print("Sign in first.")
            elif choice == "2":
                print("Admin action permitted." if self.session.permits_admin() else "Access denied for this role.")
            elif choice == "3":
                valid = self.verifiers[self.session.user.user_id].verify(input("Current code: "))
                print("Code verified." if valid else "Invalid or expired code.")
            else:
                self.session.active = False
                print("Signed out.")


if __name__ == "__main__":
    try:
        AuthMatrixApp().run()
    except (EOFError, KeyboardInterrupt):
        print("\nDemo closed.")
