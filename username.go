package main

import "fmt"

// get and set the Username and Password
func VerifyUsername(new_username string) error {
	if len(new_username) <= 250 {
		return nil
	} else {
		return fmt.Errorf("Username is invalid")
	}
}

func (a *App) GetUsername() string {
	var config, err = a.GetConfig()
	if err != nil {
		return ""
	}
	return config.Username
}
