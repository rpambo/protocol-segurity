package identity

import "testing"

func TestHashPasswordAndVerify(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatal(err)
	}
	ok, err := VerifyPassword(hash, "correct horse battery staple")
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("expected password to verify")
	}
}

func TestVerifyPasswordRejectsIncorrectPassword(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatal(err)
	}
	ok, err := VerifyPassword(hash, "incorrect horse battery staple")
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("incorrect password verified")
	}
}

func TestHashPasswordEnforcesLength(t *testing.T) {
	if _, err := HashPassword("short"); err == nil {
		t.Fatal("expected password length error")
	}
	if _, err := HashPassword(string(make([]byte, 1025))); err == nil {
		t.Fatal("expected maximum password length error")
	}
}

func TestVerifyPasswordRejectsUnsafeArgonParameters(t *testing.T) {
	_, err := VerifyPassword("$argon2id$v=19$m=999999999,t=3,p=1$c2FsdHNhbHQ$YWJjZGVmZ2hpamtsbW5vcA", "password")
	if err == nil {
		t.Fatal("expected invalid Argon2 parameters to be rejected")
	}
}
