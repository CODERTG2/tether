package main

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

// Verify the IP address
func VerifyIP(new_ip string) (string, error) {
	if strings.Contains(new_ip, ".local") {
		return VerifyIPLocal(new_ip)
	} else {
		return VerifyIPv4(new_ip)
	}
}

func (a *App) GetIP() (string, error) {
	var config, err = a.GetConfig()
	if err != nil {
		return "", err
	}
	return config.IP, nil
}

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

func VerifyIPv4(new_ip string) (string, error) {
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

func VerifyIPLocal(new_ip string) (string, error) {
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
