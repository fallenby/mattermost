// Copyright (c) 2015 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

package model

import (
	"encoding/json"
	"io"
)

const (
	MEMBER_OFFLINE_TIMEOUT = 1 * 60 * 1000 // 1 minute
)

type ExtraMember struct {
	Id                 string `json:"id"`
	Nickname           string `json:"nickname"`
	Email              string `json:"email"`
	Roles              string `json:"roles"`
	Username           string `json:"username"`
	LastActivityAt     int64  `json:"last_activity_at,omitempty"`
	LastPingAt         int64  `json:"last_ping_at,omitempty"`
	Offline            bool   `json:"offline"`
}

func (o *ExtraMember) Sanitize(options map[string]bool) {
	if len(options) == 0 || !options["email"] {
		o.Email = ""
	}
}

type ChannelExtra struct {
	Id          string        `json:"id"`
	Members     []ExtraMember `json:"members"`
	MemberCount int64         `json:"member_count"`
}

func (o *ChannelExtra) ToJson() string {
	b, err := json.Marshal(o)
	if err != nil {
		return ""
	} else {
		return string(b)
	}
}

func ChannelExtraFromJson(data io.Reader) *ChannelExtra {
	decoder := json.NewDecoder(data)
	var o ChannelExtra
	err := decoder.Decode(&o)
	if err == nil {
		return &o
	} else {
		return nil
	}
}

func (o *ExtraMember) IsOffline() bool {
	return (GetMillis()-o.LastPingAt) > MEMBER_OFFLINE_TIMEOUT && (GetMillis()-o.LastActivityAt) > MEMBER_OFFLINE_TIMEOUT
}
