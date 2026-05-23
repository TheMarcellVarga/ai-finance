package httpapi

import "net/http"

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"requestId"`
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code string, message string) {
	writeJSON(w, status, errorResponse{
		Error: errorBody{
			Code:      code,
			Message:   message,
			RequestID: RequestID(r.Context()),
		},
	})
}
