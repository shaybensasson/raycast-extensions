import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { AwsAction } from "./components/common/action";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { useCloudWatchAlarms } from "./hooks/use-cloudwatch-alarms";
import { resourceToConsoleLink } from "./util";
import { useCachedState } from "@raycast/utils";
import { StateValue } from "@aws-sdk/client-cloudwatch";

const stateColor: Record<string, Color> = {
  [StateValue.ALARM]: Color.Red,
  [StateValue.OK]: Color.Green,
  [StateValue.INSUFFICIENT_DATA]: Color.SecondaryText,
};

function formatPeriod(seconds: number | undefined): string {
  if (!seconds) return "";
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

export default function CloudWatchAlarms() {
  const [query, setQuery] = useState<string>("");
  const [isDetailsEnabled, setDetailsEnabled] = useCachedState<boolean>("show-details", false, {
    cacheNamespace: "aws-cw-alarms",
  });
  const { alarms, error, isLoading, mutate } = useCloudWatchAlarms(query);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search alarms by name"
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
      onSearchTextChange={setQuery}
      isShowingDetail={!isLoading && !error && (alarms || []).length > 0 && isDetailsEnabled}
      throttle
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && alarms?.length === 0 && (
        <List.EmptyView
          title="No alarms found!"
          icon={{ source: Icon.Warning, tintColor: Color.Orange }}
          actions={
            <ActionPanel>
              <Action title="Invalidate Cache" icon={Icon.Trash} onAction={() => mutate()} />
            </ActionPanel>
          }
        />
      )}
      {(alarms ?? []).map((alarm) => (
        <List.Item
          key={alarm.AlarmArn}
          title={alarm.AlarmName ?? ""}
          icon={Icon.Bell}
          accessories={
            isDetailsEnabled
              ? []
              : [
                  {
                    tag: {
                      value: alarm.StateValue ?? "?",
                      color: stateColor[alarm.StateValue ?? ""] ?? Color.SecondaryText,
                    },
                    tooltip: "Alarm State",
                  },
                  { text: formatPeriod(alarm.Period), tooltip: "Period" },
                ]
          }
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Alarm Name" text={alarm.AlarmName} />
                  <List.Item.Detail.Metadata.Label title="Alarm ARN" text={alarm.AlarmArn} />
                  {alarm.AlarmDescription && (
                    <List.Item.Detail.Metadata.Label title="Description" text={alarm.AlarmDescription} />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="State"
                    text={alarm.StateValue}
                    icon={{ source: Icon.Circle, tintColor: stateColor[alarm.StateValue ?? ""] ?? Color.SecondaryText }}
                  />
                  {alarm.StateReason && (
                    <List.Item.Detail.Metadata.Label title="State Reason" text={alarm.StateReason} />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Namespace" text={alarm.Namespace} />
                  <List.Item.Detail.Metadata.Label title="Metric" text={alarm.MetricName} />
                  <List.Item.Detail.Metadata.Label title="Period" text={formatPeriod(alarm.Period)} />
                  {alarm.EvaluationPeriods !== undefined && (
                    <List.Item.Detail.Metadata.Label
                      title="Evaluation Periods"
                      text={String(alarm.EvaluationPeriods)}
                    />
                  )}
                  {alarm.Threshold !== undefined && (
                    <List.Item.Detail.Metadata.Label title="Threshold" text={String(alarm.Threshold)} />
                  )}
                  {alarm.ComparisonOperator && (
                    <List.Item.Detail.Metadata.Label title="Comparison" text={alarm.ComparisonOperator} />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <AwsAction.Console url={resourceToConsoleLink(alarm.AlarmName, "AWS::CloudWatch::Alarm")} />
              <ActionPanel.Section title="Alarm Actions">
                <Action.CopyToClipboard title="Copy Alarm Name" content={alarm.AlarmName ?? ""} />
                <Action.CopyToClipboard title="Copy Alarm ARN" content={alarm.AlarmArn ?? ""} />
                <Action
                  title={`${isDetailsEnabled ? "Hide" : "Show"} Details`}
                  onAction={() => setDetailsEnabled(!isDetailsEnabled)}
                  icon={isDetailsEnabled ? Icon.EyeDisabled : Icon.Eye}
                />
                <Action title="Invalidate Cache" icon={Icon.Trash} onAction={() => mutate()} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
