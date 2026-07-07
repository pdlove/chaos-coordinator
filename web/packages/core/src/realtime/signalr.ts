import { useQueryClient } from "@tanstack/react-query";
import * as signalR from "@microsoft/signalr";
import { useEffect } from "react";
import { RealtimeEvents } from "@chaos-coordinator/shared";

let connection: signalR.HubConnection | null = null;

/** Same-origin relative URL — see the note in api/client.ts. A future RN app needs an absolute
 * URL, set once via `configureRealtimeUrl()` before the first `useRealtimeInvalidation` call. */
let hubUrl = "/hubs/household";
export function configureRealtimeUrl(url: string) {
  hubUrl = url;
  connection = null; // force reconnect against the new URL if already constructed
}

function getConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();
  }
  return connection;
}

/** Coarse event name -> React Query cache-key prefixes to invalidate. Deliberately coarse
 * ("this resource changed, refetch") rather than merging partial payloads — correctness-first,
 * and household data volumes are small enough that refetch-on-invalidate has no real cost. */
const EVENT_TO_QUERY_KEYS: Record<string, string[]> = {
  [RealtimeEvents.HouseholdChanged]: ["household"],
  [RealtimeEvents.CalendarChanged]: ["events"],
  [RealtimeEvents.ChoresChanged]: ["chores", "choreGroups"],
  [RealtimeEvents.TasksChanged]: ["tasks"],
  [RealtimeEvents.ProjectsChanged]: ["projects"],
  [RealtimeEvents.ShoppingChanged]: ["stores", "shoppingItems"],
  [RealtimeEvents.BillsChanged]: ["bills", "billTemplates"],
  [RealtimeEvents.FoodChanged]: ["menu", "recipes"],
};

/** Joins the household's SignalR group and invalidates the matching React Query keys whenever the
 * server broadcasts a change — call once near the app root once a household id is known. */
export function useRealtimeInvalidation(householdId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!householdId) return;
    const conn = getConnection();

    const onEvent = (eventName: string) => {
      for (const key of EVENT_TO_QUERY_KEYS[eventName] ?? []) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    };
    conn.on("event", onEvent);

    const join = () => conn.invoke("JoinHousehold", householdId).catch(console.error);
    conn.onreconnected(join);

    (async () => {
      if (conn.state === signalR.HubConnectionState.Disconnected) {
        await conn.start();
      }
      await join();
    })().catch(console.error);

    return () => {
      conn.off("event", onEvent);
    };
  }, [householdId, queryClient]);
}
