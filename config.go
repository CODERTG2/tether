package main

import (
	"encoding/json"
	"fmt"
	"os"
)

type Config struct {
	IP       string
	Username string
}

func (a *App) SetConfig(new_ip string, new_username string) error {
	baseDir, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("Could not get config directory: %v", err)
	}
	var path string = baseDir + "/tether"

	ip, err1 := VerifyIP(new_ip)
	err2 := VerifyUsername(new_username)

	if err1 == nil && err2 == nil {
		var config Config = Config{IP: ip, Username: new_username}
		return Write(path, config)
	} else if err1 != nil {
		return err1
	} else {
		return err2
	}
}

func (a *App) GetConfig() (Config, error) {
	baseDir, err := os.UserConfigDir()
	if err != nil {
		return Config{}, fmt.Errorf("Could not get config directory: %v", err)
	}
	var path string = baseDir + "/tether"
	return Read(path)
}

func (a *App) GetIP() (string, error) {
	var config, err = a.GetConfig()
	if err != nil {
		return "", err
	}
	return config.IP, nil
}

func (a *App) GetUsername() (string, error) {
	var config, err = a.GetConfig()
	if err != nil {
		return "", err
	}
	return config.Username, nil
}

func Write(path string, config Config) error {
	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("Could not create config file: %v", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(config); err != nil {
		return fmt.Errorf("Could not encode config file: %v", err)
	}
	return nil
}

func Read(path string) (Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return Config{}, fmt.Errorf("Could not open config file: %v", err)
	}
	defer file.Close()

	var config Config
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&config); err != nil {
		return Config{}, fmt.Errorf("Could not decode config file: %v", err)
	}
	return config, nil
}
