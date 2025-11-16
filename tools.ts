import { tool } from "@langchain/core/tools";
import { google } from "googleapis";
import { TavilySearch } from "@langchain/tavily";
import {
    createEventSchema, 
    deleteEventSchema, 
    getEventSchema, 
    searchToolSchema, 
    updateEventSchema, 
    type CreateEventData,
    type DeleteEventData,
    type SearchData,
    type UpdateEventData
} from "./schema";

type GetEventParams = {
    timeMin: string;
    timeMax: string;
    q: string;
}

// type UpdateEventData = CreateEventData & { eventId: string }

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
);

oauth2Client.setCredentials({
    access_token: process.env.GOOGLE_OAUTH_ACCESS_TOKEN,
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
export const getEventsTool = tool(async (params) =>{
    /**
     * timeMin
     * Timemax
     * q
     */
    const { timeMin, timeMax, q } = params as GetEventParams;
    // console.log("DEBUG: Called Get Events Tool:", params)
    try{
        const response = await calendar.events.list({
            // calendarId: "pankajadi447@gmail.com"/
            calendarId: "primary",
            q,
            timeMin,
            timeMax
        })
        const result = response.data.items?.map(event => {
            return {
                id: event.id,
                start: event.start,
                end: event.end,
                summary: event.summary,
                status: event.status,
                organizer: event.organizer,
                attendees: event.attendees,
                meetingLink: event.hangoutLink,
                eventType: event.eventType
            }
        });
        return JSON.stringify(result)
    } catch(err) {
        console.log("Error: ", err)
    }
    return "Failed to connect with the calendar."
}, {
    name: 'get-events',
    description: "Call to get the calendar events.",
    schema: getEventSchema
});

export const createEventTool = tool(async ( eventData ) => {
        const { summary, attendees, end, start } = eventData as CreateEventData;
        // console.log("DEBUG: Create event tool called: ", eventData);
        const response = await calendar.events.insert({
            calendarId: "primary",
            sendUpdates: 'all',
            
            conferenceDataVersion: 1,
            requestBody: {
                start,
                end,
                summary,
                attendees,
                conferenceData: {
                    createRequest: {
                        requestId: crypto.randomUUID(),
                        conferenceSolutionKey: {
                            type: "hangoutsMeet",
                        }
                    }
                }
            }
        });
        if(response.statusText === "OK") {
            return "Meeting has been created."
        }
        return "Could not create the meeting."
    },
    {
        name: "create-event",
        description: "call to create the calendar event.",
        schema: createEventSchema
    }
)

export const updateEventTool = tool(async (eventData) => {
    const { eventId, start, end, summary, attendees } = eventData as UpdateEventData;
    // console.log("DEBUG PATCH eventData: ", eventData);
    // Build requestBody only with provided fields
    const requestBody: any = {};

    if (summary) requestBody.summary = summary;
    if (start) requestBody.start = start;
    if (end) requestBody.end = end;
    if (attendees) requestBody.attendees = attendees;

    // Always include Meet link creation unless you want to make this optional
    requestBody.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    };

    const response = await calendar.events.patch({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
      conferenceDataVersion: 1,
      requestBody,
    });

    // console.log("DEBUG PATCH event respons: ", response);

    return response.status === 200
      ? "Meeting updated successfully."
      : "Failed to update the meeting.";
  },
  {
    name: "update-event",
    description: "Call to update one or more fields of a Google Calendar event.",
    schema: updateEventSchema,
  }
);

export const deleteEventTool = tool(async (eventData) => {
    const { eventId } = eventData as DeleteEventData;
    // console.log("DEBUG DELETE eventData: ", eventData);
    const response = await calendar.events.delete({
        calendarId: "primary",
        eventId,
        sendUpdates: "all"
    });

    // console.log("/DEBUG DELETE Event response: ", response)

    if (response.status === 204) {
      return "Event deleted successfully.";
    }

    return "Failed to delete the event.";
}, 
{
    name: 'delete-event',
    description: "Call to delete an event.",
    schema: deleteEventSchema
})


/**
 * Web search tool
 * 
 */

export const search = new TavilySearch({
    tavilyApiKey: process.env.TAVILY_API_KEY!,
    maxResults: 3,
    topic: "general",
});

export const webSearchTool = tool(async ({ query } : SearchData) => {
    // console.log("DEBUG: Serach Query : ", query);
    const response = await search.invoke({ query });
    // console.log("DEBUG: Serach Response : ", response);
    if(response.results?.length) {
        return JSON.stringify(response.results);
    }
    return "Could not fetch information from the internet due to some issue."
}, 
{
    name: 'web-search',
    description: "Call to fetch information from the internet.",
    schema: searchToolSchema
})