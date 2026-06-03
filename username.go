package main

import "fmt"

// get and set the Username and Password
func VerifyUsername(new_username string) error {
	if len(new_username) <= 250 && len(new_username) > 0 {
		return nil
	} else {
		return fmt.Errorf("Username is invalid")
	}
}
