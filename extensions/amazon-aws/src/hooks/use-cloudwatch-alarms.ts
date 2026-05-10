import { useCachedPromise } from "@raycast/utils";
import { CloudWatchClient, DescribeAlarmsCommand, MetricAlarm } from "@aws-sdk/client-cloudwatch";
import { isReadyToFetch } from "../util";

export const useCloudWatchAlarms = (query: string) => {
  const {
    data: alarms,
    mutate,
    error,
    isLoading,
  } = useCachedPromise(
    async () => {
      const client = new CloudWatchClient({});
      const all: MetricAlarm[] = [];
      let nextToken: string | undefined;

      do {
        const { MetricAlarms: page, NextToken } = await client.send(
          new DescribeAlarmsCommand({ MaxRecords: 100, NextToken: nextToken }),
        );
        all.push(...(page ?? []));
        nextToken = NextToken;
      } while (nextToken);

      return all.sort((a, b) => (a.AlarmName ?? "").localeCompare(b.AlarmName ?? ""));
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌ Failed to load CloudWatch alarms" } },
  );

  const filtered =
    query.trim().length > 0
      ? (alarms ?? []).filter((a) => a.AlarmName?.toLowerCase().includes(query.trim().toLowerCase()))
      : alarms;

  return { alarms: filtered, error, isLoading: (!alarms && !error) || isLoading, mutate };
};
