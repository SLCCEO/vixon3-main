import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { AccessError, requireManager } from "@/lib/auth";
import { getValidAccessToken } from "@/lib/connections";

type TwitchSegment = {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  category?: { name?: string };
};

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === request.nextUrl.origin);
}

function makeCalendarEventId(userId: string, segmentId: string) {
  return createHash("sha256")
    .update(`${userId}:${segmentId}`)
    .digest("hex")
    .slice(0, 40);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  try {
    const { user } = await requireManager();
    const [twitch, google] = await Promise.all([
      getValidAccessToken(user.id, "twitch"),
      getValidAccessToken(user.id, "google"),
    ]);

    const twitchProfileResponse = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${twitch.token}`,
        "Client-Id": process.env.TWITCH_CLIENT_ID ?? "",
      },
      cache: "no-store",
    });
    if (!twitchProfileResponse.ok) {
      return NextResponse.json({ error: "Unable to verify the connected Twitch account." }, { status: 502 });
    }
    const twitchProfile = (await twitchProfileResponse.json()) as {
      data?: Array<{ id: string; login: string }>;
    };
    const broadcaster = twitchProfile.data?.[0];
    if (!broadcaster || broadcaster.id !== twitch.connection.provider_account_id) {
      return NextResponse.json({ error: "The connected Twitch account could not be verified." }, { status: 502 });
    }

    const scheduleUrl = new URL("https://api.twitch.tv/helix/schedule");
    scheduleUrl.searchParams.set("broadcaster_id", broadcaster.id);
    scheduleUrl.searchParams.set("first", "25");
    const twitchResponse = await fetch(scheduleUrl, {
      headers: {
        Authorization: `Bearer ${twitch.token}`,
        "Client-Id": process.env.TWITCH_CLIENT_ID ?? "",
      },
      cache: "no-store",
    });
    if (!twitchResponse.ok) {
      return NextResponse.json({ error: "Twitch could not return the channel schedule." }, { status: 502 });
    }
    const schedule = (await twitchResponse.json()) as {
      data?: { segments?: TwitchSegment[] };
    };
    const segments = (schedule.data?.segments ?? []).filter(
      (segment) =>
        segment.id &&
        Number.isFinite(Date.parse(segment.start_time)) &&
        Number.isFinite(Date.parse(segment.end_time)) &&
        Date.parse(segment.end_time) > Date.parse(segment.start_time),
    );

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return NextResponse.json({ error: "Google Calendar is not configured." }, { status: 503 });
    }

    let created = 0;
    let updated = 0;
    for (const segment of segments) {
      const eventId = makeCalendarEventId(user.id, segment.id);
      const event = {
        id: eventId,
        summary: segment.title || "Twitch stream",
        description: [
          `Synced from Twitch @${broadcaster.login}.`,
          segment.category?.name ? `Category: ${segment.category.name}` : "",
          `https://www.twitch.tv/${broadcaster.login}`,
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: segment.start_time },
        end: { dateTime: segment.end_time },
        source: { title: "Twitch schedule", url: `https://www.twitch.tv/${broadcaster.login}` },
        extendedProperties: {
          private: {
            shiftstreamTwitchSegmentId: segment.id,
            shiftstreamOwner: user.id,
          },
        },
      };

      const eventUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
      const updateResponse = await fetch(eventUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${google.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
        cache: "no-store",
      });

      if (updateResponse.status === 404) {
        const insertResponse = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${google.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
            cache: "no-store",
          },
        );
        if (insertResponse.status === 409) {
          const retryResponse = await fetch(eventUrl, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${google.token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
            cache: "no-store",
          });
          if (retryResponse.ok) {
            updated += 1;
            continue;
          }
        }
        if (!insertResponse.ok) {
          return NextResponse.json(
            { error: "Google Calendar rejected a scheduled event." },
            { status: 502 },
          );
        }
        created += 1;
      } else if (updateResponse.ok) {
        updated += 1;
      } else {
        return NextResponse.json(
          { error: "Google Calendar could not update a scheduled event." },
          { status: 502 },
        );
      }
    }

    return NextResponse.json({
      channel: broadcaster.login,
      total: segments.length,
      created,
      updated,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Unable to sync the Twitch schedule.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
