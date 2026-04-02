import { useCachedPromise } from "@raycast/utils";
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { isReadyToFetch } from "../util";

export const useLogGroups = (query: string) => {
  const {
    data: logGroups,
    mutate,
    error,
    isLoading,
  } = useCachedPromise(
    async () => {
      const client = new CloudWatchLogsClient({});
      const allGroups = [];
      let nextToken: string | undefined;

      do {
        const { logGroups: groups, nextToken: token } = await client.send(
          new DescribeLogGroupsCommand({ limit: 50, nextToken }),
        );
        allGroups.push(...(groups ?? []));
        nextToken = token;
      } while (nextToken);

      return allGroups
        .filter(
          (group) =>
            !!group && !!group.logGroupArn && !!group.logGroupName && !!group.creationTime,
        )
        .sort((a, b) => b.creationTime! - a.creationTime!);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load log groups" } },
  );

  const filtered =
    query.trim().length > 0
      ? (logGroups ?? []).filter((g) => g.logGroupName!.toLowerCase().includes(query.trim().toLowerCase()))
      : logGroups;

  return { logGroups: filtered, error, isLoading: (!logGroups && !error) || isLoading, mutate };
};
