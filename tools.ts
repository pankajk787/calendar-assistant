import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { google } from "googleapis";

type GetEventParams = {
    timeMin: string;
    timeMax: string;
    q: string;
}

const createEventSchema = z.object({ 
    summary: z.string().describe("The title of the event."),
    start: z.object({
        dateTime: z.string("The start date time of the event."),
        timeZone: z.string("Current IANA timezone string.")
    }),
    end: z.object({
        dateTime: z.string("The end date time of the event."),
        timeZone: z.string("Current IANA timezone string.")
    }),
    attendees: z.array(z.object({
        email: z.string().describe("Te email Id of the attendee"),
        displayName: z.string().describe("Te display name of the attendee")
    }))
});
type CreateEventData = z.infer<typeof createEventSchema>;

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
    schema: z.object({
        timeMin: z.string().describe("The 'from' date time to get the events."),
        timeMax: z.string().describe("The 'to' date time to get the events."),
        q: z.string().describe("The query to be used to describe get the vents from google calendar. It will be used for free-text search filter. It can be any one of these values: summary, description, location, attendee's display name, attendee's email, organizer's display name, organizer's email.")})
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