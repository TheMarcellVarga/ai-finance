package research

import (
	"context"
	"log/slog"
	"time"
)

func RunWorker(ctx context.Context, processor *Processor, workerID string, pollInterval time.Duration, logger *slog.Logger) {
	if logger == nil {
		logger = slog.Default()
	}
	if pollInterval <= 0 {
		pollInterval = 2 * time.Second
	}
	logger.Info("document worker started", "workerId", workerID, "pollInterval", pollInterval.String())
	defer logger.Info("document worker stopped", "workerId", workerID)
	for ctx.Err() == nil {
		processed, err := processor.ProcessNext(ctx, workerID)
		if err != nil {
			logger.Error("document worker iteration failed", "error", err)
		}
		if processed {
			continue
		}
		timer := time.NewTimer(pollInterval)
		select {
		case <-ctx.Done():
			if !timer.Stop() {
				<-timer.C
			}
		case <-timer.C:
		}
	}
}
