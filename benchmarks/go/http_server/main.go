package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	// Create HTTP server with handlers
	mux := http.NewServeMux()

	// Simple handler that returns a JSON response
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message": "Hello, World!", "status": "ok"}`))
	})

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "healthy"}`))
	})

	// Create server
	server := &http.Server{
		Addr:    ":3000",
		Handler: mux,
	}

	// Setup graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start server in goroutine
	serverErrChan := make(chan error, 1)
	go func() {
		fmt.Printf("Starting Go HTTP server on port %s\n", server.Addr)

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("Server error: %v\n", err)
			serverErrChan <- err
		}
	}()

	// Give the server a moment to start and check for immediate errors
	time.Sleep(100 * time.Millisecond)

	// Check if server started successfully
	select {
	case err := <-serverErrChan:
		log.Fatalf("Server failed to start: %v\n", err)
	default:
		fmt.Println("Go HTTP server started successfully")
	}

	// For CI environments, run for a maximum time instead of waiting indefinitely
	maxRunTime := 5 * time.Minute
	timeoutChan := time.After(maxRunTime)

	// Wait for interrupt signal or timeout
	select {
	case <-sigChan:
		fmt.Println("Received shutdown signal")
	case <-timeoutChan:
		fmt.Println("Maximum run time reached, shutting down")
	case err := <-serverErrChan:
		log.Fatalf("Server error: %v\n", err)
	}

	fmt.Println("Server shutting down...")

	// Create context with timeout for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Attempt graceful shutdown
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Server stopped gracefully")
}
