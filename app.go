package main

import (
	"context"
	"fmt"
	"os/exec"
)

// App struct
type App struct {
	ctx context.Context
	ip  string
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// access the home server
func (a *App) OpenX(action string) error {
	var protocol string

	switch action {
	case "screen":
		protocol = "vnc"
	case "file":
		protocol = "smb"
	default:
		return fmt.Errorf("Invalid action")
	}

	var ip, err1 = a.GetIP()
	var username = a.GetUsername()
	var pwd = a.GetPassword()

	if err1 != nil {
		return fmt.Errorf("Could not get IP")
	}

	err := exec.Command("open", protocol+"://"+username+":"+pwd+"@"+ip).Run()
	if err != nil {
		return err
	}
	return nil
}
