// Maps company verticals to assistant function schemas
// Each function object matches the Web API function-calling schema expected by Vapi's CreateAssistantDTO.model.functions

export function getFunctionsForVertical(vertical: string): any[] {
  const v = (vertical || "").toLowerCase();
  switch (v) {
    case "hotel":
      return hotelFunctions;
    case "marketing":
      return marketingFunctions;
    case "broadway":
    default:
      return broadwayFunctions;
  }
}

// --- Broadway (default) ---
const broadwayFunctions: any[] = [
  {
    name: "suggestShows",
    async: true,
    description: "Suggests a list of broadway shows to the user.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The location for which the user wants to see the shows.",
        },
        date: {
          type: "string",
          description: "The date for which the user wants to see the shows.",
        },
      },
    },
  },
  {
    name: "confirmDetails",
    async: true,
    description: "Confirms the details provided by the user.",
    parameters: {
      type: "object",
      properties: {
        show: {
          type: "string",
          description: "The show for which the user wants to book tickets.",
        },
        date: {
          type: "string",
          description: "The date for which the user wants to book the tickets.",
        },
        location: {
          type: "string",
          description: "The location for which the user wants to book the tickets.",
        },
        numberOfTickets: {
          type: "number",
          description: "The number of tickets that the user wants to book.",
        },
      },
    },
  },
  {
    name: "bookTickets",
    async: true,
    description: "Books tickets for the user.",
    parameters: {
      type: "object",
      properties: {
        show: {
          type: "string",
          description: "The show for which the user wants to book tickets.",
        },
        date: {
          type: "string",
          description: "The date for which the user wants to book the tickets.",
        },
        location: {
          type: "string",
          description: "The location for which the user wants to book the tickets.",
        },
        numberOfTickets: {
          type: "number",
          description: "The number of tickets that the user wants to book.",
        },
      },
    },
  },
];

// --- Hotel ---
const hotelFunctions: any[] = [
  {
    name: "suggestHotels",
    async: true,
    description: "Suggests a list of hotels to the user.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description:
            "City or area where the user wants to stay (e.g., 'Paris' or 'Dubai Marina').",
        },
        checkInDate: {
          type: "string",
          description: "Check-in date in ISO format (YYYY-MM-DD).",
        },
        checkOutDate: {
          type: "string",
          description: "Check-out date in ISO format (YYYY-MM-DD).",
        },
        adults: {
          type: "number",
          description: "Number of adult guests.",
        },
        children: {
          type: "number",
          description: "Number of child guests.",
        },
        roomType: {
          type: "string",
          description:
            "Preferred room type (e.g., 'Deluxe Room', 'Executive Suite').",
        },
        amenities: {
          type: "array",
          items: { type: "string" },
          description: "Desired amenities (e.g., ['Free Wi-Fi','Pool','Spa']).",
        },
        budgetPerNight: {
          type: "number",
          description: "Approximate budget per night in the booking currency.",
        },
      },
      required: ["location", "checkInDate", "checkOutDate"],
    },
  },
  {
    name: "confirmReservationDetails",
    async: true,
    description: "Confirms the hotel reservation details with the user.",
    parameters: {
      type: "object",
      properties: {
        hotelName: {
          type: "string",
          description:
            "The hotel the user wants to book (e.g., 'Five Season Hotels – Paris').",
        },
        location: {
          type: "string",
          description: "City/area of the hotel.",
        },
        checkInDate: {
          type: "string",
          description: "Check-in date (YYYY-MM-DD).",
        },
        checkOutDate: {
          type: "string",
          description: "Check-out date (YYYY-MM-DD).",
        },
        roomType: {
          type: "string",
          description: "Room category (e.g., 'Deluxe Room').",
        },
        rooms: {
          type: "number",
          description: "Number of rooms to book.",
        },
        adults: {
          type: "number",
          description: "Number of adult guests.",
        },
        children: {
          type: "number",
          description: "Number of child guests.",
        },
        specialRequests: {
          type: "string",
          description:
            "Optional requests (e.g., high floor, late check-in, crib).",
        },
        paymentMethod: {
          type: "string",
          description:
            "Preferred payment method (e.g., 'card_on_file', 'new_card', 'pay_at_hotel').",
        },
        cancellationPolicyAck: {
          type: "boolean",
          description: "Whether the user acknowledges the cancellation policy.",
        },
      },
      required: [
        "hotelName",
        "location",
        "checkInDate",
        "checkOutDate",
        "roomType",
        "rooms",
        "adults",
      ],
    },
  },
  {
    name: "bookRoom",
    async: true,
    description: "Creates a hotel reservation for the user.",
    parameters: {
      type: "object",
      properties: {
        hotelId: {
          type: "string",
          description: "Backend identifier of the hotel/property.",
        },
        roomTypeCode: {
          type: "string",
          description: "Backend room type code/SKU.",
        },
        checkInDate: {
          type: "string",
          description: "Check-in date (YYYY-MM-DD).",
        },
        checkOutDate: {
          type: "string",
          description: "Check-out date (YYYY-MM-DD).",
        },
        rooms: {
          type: "number",
          description: "Number of rooms to reserve.",
        },
        guests: {
          type: "array",
          description: "Guest roster per room.",
          items: {
            type: "object",
            properties: {
              firstName: { type: "string" },
              lastName: { type: "string" },
              adults: { type: "number" },
              children: { type: "number" },
            },
            required: ["firstName", "lastName", "adults"],
          },
        },
        currency: {
          type: "string",
          description: "ISO currency code (e.g., 'USD', 'EUR').",
        },
        totalPrice: {
          type: "number",
          description: "Final total price for the stay (from BE quote).",
        },
        paymentToken: {
          type: "string",
          description: "Tokenized payment method or reference (PCI-safe).",
        },
        specialRequests: {
          type: "string",
          description: "Optional notes for the property.",
        },
        agreeToPolicies: {
          type: "boolean",
          description: "User agrees to hotel terms and cancellation policy.",
        },
      },
      required: [
        "hotelId",
        "roomTypeCode",
        "checkInDate",
        "checkOutDate",
        "rooms",
        "guests",
        "currency",
        "totalPrice",
        "agreeToPolicies",
      ],
    },
  },
];

// --- Marketing ---
const marketingFunctions: any[] = [
  {
    name: "suggestCampaigns",
    async: true,
    description:
      "Suggests a list of suitable marketing campaign ideas or strategies for the client.",
    parameters: {
      type: "object",
      properties: {
        industry: {
          type: "string",
          description:
            "The client's industry or niche (e.g., 'real estate', 'tech startup', 'hospitality').",
        },
        targetAudience: {
          type: "string",
          description:
            "Description of the campaign's target audience (e.g., 'Gen Z in the US', 'B2B SaaS decision-makers').",
        },
        budget: {
          type: "number",
          description: "Estimated budget for the campaign in USD.",
        },
        campaignGoal: {
          type: "string",
          description:
            "Primary objective (e.g., 'brand awareness', 'lead generation', 'product launch').",
        },
        startDate: {
          type: "string",
          description: "Proposed start date for the campaign (YYYY-MM-DD).",
        },
      },
      required: ["industry", "targetAudience", "budget", "campaignGoal"],
    },
  },
  {
    name: "confirmCampaignDetails",
    async: true,
    description:
      "Confirms the details of the proposed marketing campaign with the client.",
    parameters: {
      type: "object",
      properties: {
        campaignName: {
          type: "string",
          description: "The name of the marketing campaign.",
        },
        industry: {
          type: "string",
          description: "Client's industry or business sector.",
        },
        targetAudience: {
          type: "string",
          description: "Detailed target audience profile.",
        },
        budget: {
          type: "number",
          description: "Total allocated budget for the campaign.",
        },
        startDate: {
          type: "string",
          description: "Confirmed campaign start date (YYYY-MM-DD).",
        },
        endDate: {
          type: "string",
          description: "Confirmed campaign end date (YYYY-MM-DD).",
        },
        platforms: {
          type: "array",
          description:
            "Marketing platforms/channels to be used (e.g., ['Facebook Ads', 'Google Ads', 'Email']).",
          items: { type: "string" },
        },
        deliverables: {
          type: "array",
          description:
            "List of deliverables (e.g., 'Landing Page', 'Ad Creatives', 'Video Content').",
          items: { type: "string" },
        },
      },
      required: [
        "campaignName",
        "budget",
        "startDate",
        "endDate",
        "platforms",
        "deliverables",
      ],
    },
  },
  {
    name: "launchCampaign",
    async: true,
    description: "Launches the approved marketing campaign for the client.",
    parameters: {
      type: "object",
      properties: {
        campaignId: {
          type: "string",
          description: "Unique backend ID for the campaign.",
        },
        platforms: {
          type: "array",
          description: "Platforms/channels where the campaign will be launched.",
          items: { type: "string" },
        },
        budgetAllocation: {
          type: "object",
          description: "Breakdown of the budget allocation per platform.",
          additionalProperties: { type: "number" },
        },
        creatives: {
          type: "array",
          description:
            "List of creative asset IDs to be used in the campaign.",
          items: { type: "string" },
        },
        trackingParameters: {
          type: "object",
          description:
            "UTM codes, pixel IDs, or tracking links for performance measurement.",
          additionalProperties: { type: "string" },
        },
      },
      required: [
        "campaignId",
        "platforms",
        "budgetAllocation",
        "creatives",
      ],
    },
  },
];
