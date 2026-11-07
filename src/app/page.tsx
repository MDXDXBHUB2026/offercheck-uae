import CheckPage, { metadata as checkMetadata } from "./check/page";

// "/" shows the Check workspace itself, so an old link or bookmark keeps working without a redirect.
export const metadata = checkMetadata;

export default CheckPage;
