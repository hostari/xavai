-- Wedding RSVP Database Schema
-- Create database table for storing RSVP responses

CREATE TABLE IF NOT EXISTS rsvp_responses (
    id SERIAL PRIMARY KEY,
    invited_by VARCHAR(255),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    nickname VARCHAR(255),
    country VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    travel_party VARCHAR(255),
    travel_origin VARCHAR(255),
    party_code VARCHAR(50) NOT NULL,
    total_guests INTEGER DEFAULT 1,
    response VARCHAR(20) NOT NULL CHECK (response IN ('accepted', 'declined')),
    dietary_restrictions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on party_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_rsvp_party_code ON rsvp_responses(party_code);

-- Create index on email for potential lookups
CREATE INDEX IF NOT EXISTS idx_rsvp_email ON rsvp_responses(email);

-- Create index on response status for analytics
CREATE INDEX IF NOT EXISTS idx_rsvp_response ON rsvp_responses(response);