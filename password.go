package main

import (
	"fmt"

	"github.com/zalando/go-keyring"
)

func (a *App) SetPassword(new_password string) error {
	if len(new_password) >= 4 {
		err := keyring.Set("tether", "password", new_password)
		if err != nil {
			return fmt.Errorf("Could not set password: %v", err)
		}
		return nil
	} else {
		return fmt.Errorf("Password is invalid")
	}
}

func (a *App) GetPassword() (string, error) {
	pwd, err := keyring.Get("tether", "password")
	if err != nil {
		return "", fmt.Errorf("Could not get password: %v", err)
	}
	return pwd, nil
}
