// Core types for Where2Meet application

export type EventStatus = 'WAITING' | 'READY' | 'VOTING' | 'FINALIZED' | 'EXPIRED';

export interface Event {
  id: string;
  shortCode: string;
  title: string;
  purpose?: 'dining' | 'coffee' | 'meeting' | 'other';
  eventTime?: Date;
  specialRequirements?: string;
  status: EventStatus;
  expectedParticipants: number;
  votingStartedAt?: Date;
  votingEndedAt?: Date;
  finalLocationId?: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  participants: Participant[];
  recommendations: Recommendation[];
  votes?: Vote[];
  finalLocation?: Recommendation;
}

export interface Participant {
  id: number;
  eventId: string;
  nickname: string;
  address: string;
  isCreator: boolean;
  joinedAt: Date;
}

export interface Recommendation {
  id: number;
  eventId: string;
  locationName?: string;
  locationType?: string;
  description?: string;
  fairnessAnalysis?: string;
  suitabilityScore?: number;
  rank: number;
  facilities?: string[];
  distances?: DistanceInfo[];
  generatedAt: Date;
}

export interface Vote {
  id: number;
  recommendationId: number;
  eventId: string;
  voterNickname: string;
  votedAt: Date;
}

export interface RecommendationWithVotes extends Recommendation {
  voteCount: number;
  voters: string[];
  hasCurrentUserVoted: boolean;
}

export interface VoteSummary {
  recommendationId: number;
  locationName: string;
  voteCount: number;
  voters: string[];
  hasCurrentUserVoted: boolean;
}

export interface DistanceInfo {
  participant: string;
  estimate: string;
  transport: string;
  participant_address?: string;
  recommendation_address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  time?: string;
}

// Form types for validation
export interface CreateEventForm {
  title: string;
  creatorNickname: string;
  creatorAddress: string;
  purpose: 'dining' | 'coffee' | 'meeting' | 'other';
  eventTime?: string; // ISO string
  specialRequirements?: string;
  expectedParticipants: number;
}

export interface JoinEventForm {
  nickname: string;
  address: string;
}

// LLM types
export interface LLMRequest {
  title: string;
  purpose: string;
  eventTime?: Date;
  specialRequirements?: string;
  participants: { nickname: string; address: string }[];
}

// LLM Response - supports both success and error cases
export interface LLMResponse {
  // Success fields (present when no error)
  analysis?: string;
  recommendations?: {
    rank: number;
    name: string;
    type: string;
    description: string;
    fairness_analysis: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    distances: {
      participant: string;
      estimate: string;
      transport: string;
      participant_address?: string;
      recommendation_address?: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
      time?: string;
    }[];
    facilities: string[];
    suitability_score: number;
  }[];
  // Error fields (present when error occurs)
  error?: boolean;
  error_code?: string;
  error_message?: string;
  suggestions?: string;
}

// Local storage types
export interface MyEvents {
  my_events: string[];
  device_id: string;
  recent_views: Record<string, string>;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CreateEventResponse {
  event_id: string;
  short_code: string;
  url: string;
  qr_code?: string;
}

export interface JoinEventResponse {
  participant: {
    id: number;
    nickname: string;
    address: string;
    is_creator: boolean;
    joined_at: Date;
  };
  participant_count: number;
  should_generate_recommendations: boolean;
  nickname_modified: boolean;
  original_nickname?: string;
  assigned_nickname: string;
}

export interface EventDetailResponse {
  event: Event;
  participants: Participant[];
  recommendations: Recommendation[];
}

export interface VoteResponse {
  success: boolean;
  voteCount: number;
  voters: string[];
  hasCurrentUserVoted: boolean;
}

export interface VotesSummaryResponse {
  recommendations: VoteSummary[];
  totalVotes: number;
  participantCount: number;
}

export interface FinalizeEventResponse {
  finalLocation: Recommendation;
  votingEndedAt: Date;
  status: EventStatus;
}

// Error types
export type ApiError =
  | 'NETWORK_ERROR'
  | 'EVENT_NOT_FOUND'
  | 'RATE_LIMIT'
  | 'INVALID_ADDRESS'
  | 'LLM_ERROR'
  | 'VALIDATION_ERROR'
  | 'VOTING_NOT_STARTED'
  | 'ALREADY_VOTED'
  | 'NOT_PARTICIPANT'
  | 'EVENT_FULL'
  | 'VOTING_ENDED';
