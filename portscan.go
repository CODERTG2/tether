package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
)

type Port struct {
	PortNum      int    `json:"portNum"`
	ProcessTitle string `json:"processTitle"`
	FaviconPath  string `json:"faviconPath"`
	Protocol     string `json:"protocol"`
}

var commonPorts = map[int]string{
	22:    "SSH",
	88:    "Kerberos",
	445:   "SMB (File Sharing)",
	631:   "IPP (CUPS Printing)",
	1883:  "MQTT",
	4369:  "Erlang Port Mapper",
	5000:  "Flask / Web Dev",
	5432:  "PostgreSQL",
	5552:  "RabbitMQ AMQP",
	5900:  "VNC (Screen Sharing)",
	7000:  "AirPlay / Control",
	11434: "Ollama (Local AI)",
	15672: "RabbitMQ Management",
	25672: "RabbitMQ Erlang Distribution",
	61613: "STOMP Protocol",
}

func ScanWorker(ip string, jobs <-chan int, results chan<- Port, wg *sync.WaitGroup) {
	defer wg.Done()

	client := http.Client{
		Timeout: 5 * time.Second,
	}

	for port := range jobs {
		address := fmt.Sprintf("%s:%d", ip, port)
		timeout := 500 * time.Millisecond

		conn, err := net.DialTimeout("tcp", address, timeout)

		if err == nil {
			var workingPort Port = Port{PortNum: port, ProcessTitle: "", FaviconPath: "", Protocol: ""}

			// Banner
			conn.SetReadDeadline(time.Now().Add(1 * time.Second))

			buffer := make([]byte, 256)
			n, _ := conn.Read(buffer)

			banner := string(buffer[:n])

			var cleanText string
			for _, r := range banner {
				if r >= 32 && r <= 126 { // Printable ASCII range
					cleanText += string(r)
				}
			}
			cleanText = strings.TrimSpace(cleanText)

			if len(cleanText) > 0 {
				workingPort.ProcessTitle = cleanText
				workingPort.Protocol = "banner"
			}
			conn.Close()

			// HTTP
			if strings.TrimSpace(workingPort.ProcessTitle) == "" {
				url := fmt.Sprintf("http://%s", address)
				resp, err := client.Get(url)

				if err == nil {
					doc, err2 := goquery.NewDocumentFromReader(resp.Body)

					if err2 == nil {
						title := doc.Find("head title")
						if title.Length() > 0 {
							workingPort.ProcessTitle = title.Text()
							workingPort.Protocol = "http"
						} else {
							h1 := doc.Find("body h1")
							if h1.Length() > 0 {
								workingPort.ProcessTitle = h1.First().Text()
								workingPort.Protocol = "http"
							}
						}

						favicon := doc.Find("head link[rel~='icon'], head link[rel='shortcut icon']")
						if href, exists := favicon.Attr("href"); exists {
							workingPort.FaviconPath = href
						}
					}
					resp.Body.Close()
				}
			}

			if strings.TrimSpace(workingPort.ProcessTitle) == "" {
				if serviceName, exists := commonPorts[port]; exists {
					workingPort.ProcessTitle = serviceName
				} else {
					workingPort.ProcessTitle = "Unknown"
				}
				workingPort.Protocol = "map"
			}
			results <- workingPort
		}
	}
}

func (a *App) Portscan(targetIP string) []Port {
	workerCount := 100

	jobs := make(chan int, 65535)
	results := make(chan Port)

	var wg sync.WaitGroup

	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go ScanWorker(targetIP, jobs, results, &wg)
	}

	go func() {
		for i := 1; i <= 65535; i++ {
			jobs <- i
		}
		close(jobs)
	}()

	go func() {
		wg.Wait()
		close(results)
	}()

	var finalResults []Port
	for openPort := range results {
		finalResults = append(finalResults, openPort)
	}

	a.SetPorts(finalResults)

	return finalResults
}

func (a *App) SetPorts(ports []Port) error {
	baseDir, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("Could not get config directory: %v", err)
	}
	var path string = baseDir + "/ports.json"

	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("Could not create config file: %v", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(ports); err != nil {
		return fmt.Errorf("Could not encode config file: %v", err)
	}
	return nil
}

func (a *App) GetPorts() ([]Port, error) {
	baseDir, err := os.UserConfigDir()
	if err != nil {
		return []Port{}, fmt.Errorf("Could not get config directory: %v", err)
	}
	var path string = baseDir + "/ports.json"
	file, err := os.Open(path)
	if err != nil {
		return []Port{}, fmt.Errorf("Could not open config file: %v", err)
	}
	defer file.Close()

	var ports []Port
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&ports); err != nil {
		return []Port{}, fmt.Errorf("Could not decode config file: %v", err)
	}
	return ports, nil
}

func (a *App) DeletePort(portNum int) ([]Port, error) {
	ports, err := a.GetPorts()
	if err != nil {
		return []Port{}, err
	}

	var updated []Port
	for _, p := range ports {
		if p.PortNum != portNum {
			updated = append(updated, p)
		}
	}
	a.SetPorts(updated)
	return updated, nil
}

func (a *App) UpdatePortTitle(portNum int, newTitle string) ([]Port, error) {
	ports, err := a.GetPorts()
	if err != nil {
		return []Port{}, err
	}

	for i, p := range ports {
		if p.PortNum == portNum {
			ports[i].ProcessTitle = newTitle
			break
		}
	}
	a.SetPorts(ports)
	return ports, nil
}
