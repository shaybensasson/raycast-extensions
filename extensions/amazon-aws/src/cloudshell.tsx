import { getPreferenceValues, open, showHUD } from "@raycast/api";

export default async function CloudShell() {
  const { region } = getPreferenceValues<Preferences.Cloudshell>();
  const r = region.trim() || "eu-west-1";

  await open(`https://${r}.console.aws.amazon.com/cloudshell/home?region=${r}`);
  await showHUD(`Opening CloudShell in ${r}`);
}
