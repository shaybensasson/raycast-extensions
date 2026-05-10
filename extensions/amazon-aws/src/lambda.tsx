import { FunctionConfiguration, GetFunctionCommand, LambdaClient, ListFunctionsCommand } from "@aws-sdk/client-lambda";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import CloudwatchLogStreams from "./components/cloudwatch/CloudwatchLogStreams";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import InvokeLambdaFunction from "./components/lambda/InvokeLambdaFunction";

export default function Lambda() {
  const { data: functions, error, isLoading, revalidate } = useCachedPromise(fetchFunctions);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter functions by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        functions?.map((func) => <LambdaFunction key={func.FunctionName} func={func} />)
      )}
    </List>
  );
}

function LambdaFunction({ func }: { func: FunctionConfiguration }) {
  const isImage = func.PackageType === "Image";
  const { data: imageUri } = useCachedPromise(
    async (name: string) => {
      try {
        const { Code } = await new LambdaClient({}).send(new GetFunctionCommand({ FunctionName: name }));
        const uri = Code?.ResolvedImageUri ?? Code?.ImageUri ?? "";
        const path = uri.split("/").slice(1).join("/").split(":")[0].split("@")[0];
        return path.split("/").pop() ?? path;
      } catch (err) {
        console.error(`[lambda] GetFunction failed for ${name}:`, err);
        return null;
      }
    },
    [func.FunctionName ?? ""],
    { execute: isImage && !!func.FunctionName },
  );

  const runtimeLabel = isImage ? (imageUri ?? "Image") : func.Runtime ?? "";

  return (
    <List.Item
      key={func.FunctionArn}
      icon={"aws-icons/lam.png"}
      title={func.FunctionName || ""}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(func.FunctionName, "AWS::Lambda::Function")} />
          <Action.OpenInBrowser
            icon={Icon.Document}
            title="Open CloudWatch Log Group"
            url={resourceToConsoleLink(`/aws/lambda/${func.FunctionName}`, "AWS::Logs::LogGroup")}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
          <Action.Push
            title={"View Log Streams"}
            icon={Icon.Eye}
            shortcut={{ modifiers: ["opt"], key: "l" }}
            target={<CloudwatchLogStreams logGroupName={`/aws/lambda/${func.FunctionName}`}></CloudwatchLogStreams>}
          />
          <Action.Push
            title="Invoke Function"
            icon={Icon.Bolt}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<InvokeLambdaFunction functionName={func.FunctionName || ""} />}
          />
          <ActionPanel.Section title={"Copy"}>
            <Action.CopyToClipboard title="Copy Function ARN" content={func.FunctionArn || ""} />
            <Action.CopyToClipboard title="Copy Function Name" content={func.FunctionName || ""} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[{ text: runtimeLabel }, { icon: getRuntimeIcon(func.Runtime) }]}
    />
  );
}

async function fetchFunctions(
  nextMarker?: string,
  functions?: FunctionConfiguration[],
): Promise<FunctionConfiguration[]> {
  if (!isReadyToFetch()) return [];
  const { NextMarker, Functions } = await new LambdaClient({}).send(new ListFunctionsCommand({ Marker: nextMarker }));

  const combinedFunctions = [...(functions || []), ...(Functions || [])];

  if (NextMarker) {
    return fetchFunctions(NextMarker, combinedFunctions);
  }

  return combinedFunctions.sort((a, b) => (b.LastModified ?? "").localeCompare(a.LastModified ?? ""));
}

const getRuntimeIcon = (runtime: FunctionConfiguration["Runtime"]) => {
  if (!runtime) {
    return "lambda-runtime-icons/docker.png";
  }

  if (runtime.includes("node")) {
    return "lambda-runtime-icons/nodejs.png";
  } else if (runtime.includes("python")) {
    return "lambda-runtime-icons/python.png";
  } else if (runtime.includes("java")) {
    return "lambda-runtime-icons/java.png";
  } else if (runtime.includes("dotnet")) {
    return "lambda-runtime-icons/dotnet.png";
  } else if (runtime.includes("go")) {
    return "lambda-runtime-icons/go.png";
  } else if (runtime.includes("ruby")) {
    return "lambda-runtime-icons/ruby.png";
  } else {
    return Icon.ComputerChip;
  }
};
