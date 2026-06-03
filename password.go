package main

import (
	"fmt"

	"github.com/zalando/go-keyring"
)

var SERVICE string = "tether"
var KEY string = "password"

func (a *App) SetPassword(new_password string) error {
	if len(new_password) >= 4 {
		err := keyring.Set(SERVICE, KEY, new_password)
		if err != nil {
			return fmt.Errorf("Could not set password: %v", err)
		}
		return nil
	} else {
		return fmt.Errorf("Password is invalid")
	}
}

func (a *App) GetPassword() string {
	pwd, err := keyring.Get(SERVICE, KEY)
	if err != nil {
		return ""
	}
	return pwd
}

func (a *App) DeletePassword() error {
	err := keyring.Delete(SERVICE, KEY)
	if err != nil {
		return fmt.Errorf("Could not delete password: %v", err)
	}
	return nil
}
