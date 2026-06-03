package main

import (
	"context"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

// App struct
type App struct {
	ctx      context.Context
	ip       string
	username string
	password string
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

// get and set the IP address
func Ping(new_ip string) (string, error) {
	var count int = 1

	for {
		cmd := exec.Command("ping", "-c", "4", new_ip)
		output, err := cmd.Output()
		var outputString string = string(output)
		if err == nil && strings.Contains(outputString, "4 packets transmitted, 4 packets received") {
			return outputString, nil
		} else if count == 5 {
			return outputString, fmt.Errorf("IP Address is not reachable")
		} else {
			count++
		}
	}
}

func SetIPv4(new_ip string) (string, error) {
	// checks address
	var octets []string = strings.Split(new_ip, ".")
	if len(octets) != 4 {
		return new_ip, fmt.Errorf("Invalid IP Address")
	}
	for _, octet := range octets {
		var octetVal, err = strconv.Atoi(octet)
		if err != nil {
			return new_ip, fmt.Errorf("Invalid IP Address")
		}
		if octetVal < 0 || octetVal > 255 {
			return new_ip, fmt.Errorf("Invalid IP Address")
		}
	}

	// pings address
	if _, err := Ping(new_ip); err != nil {
		return new_ip, fmt.Errorf("IP Address is not reachable")
	}

	return new_ip, nil
}

func SetIPLocal(new_ip string) (string, error) {
	var parts []string = strings.Split(new_ip, ".")
	if len(parts) != 2 || parts[1] != "local" {
		return new_ip, fmt.Errorf("Invalid IP Address")
	}

	if out, err := Ping(new_ip); err == nil {
		var start int = 0
		var end int = 0

		for i, val := range out {
			switch val {
			case '(':
				start = i
			case ')':
				end = i
			}
		}

		test_ip := string(out[start+1 : end])

		if _, err = Ping(test_ip); err == nil {
			return test_ip, nil
		} else {
			return new_ip, nil
		}
	} else {
		return new_ip, fmt.Errorf("IP Address is not reachable")
	}

}

func (a *App) SetIP(new_ip string) error {
	if strings.Contains(new_ip, ".local") {
		var ip, err = SetIPLocal(new_ip)
		a.ip = ip
		return err
	} else {
		var ip, err = SetIPv4(new_ip)
		a.ip = ip
		return err
	}
}

func (a *App) GetIP() string {
	return a.ip
}

// get and set the Username and Password
func (a *App) SetUsername(new_username string) {
	a.username = new_username
}

func (a *App) GetUsername() string {
	return a.username
}

func (a *App) SetPassword(new_password string) {
	a.password = new_password
}

func (a *App) GetPassword() string {
	return a.password
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

	cmd := exec.Command("open", protocol+"://"+a.username+":"+a.password+"@"+a.ip)

	err := cmd.Run()
	if err != nil {
		return err
	}
	return nil
}
