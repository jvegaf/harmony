import { Button } from "@mantine/core";
import classes from "./Onboarding.module.css";

export interface OnboardingProps {
  openHandler: () => void;
}

export default function Onboarding({ openHandler }: OnboardingProps) {
  return (
    <div className={classes.onboardingRoot}>
      <div className={classes.uploadContainer}>
        <Button onClick={openHandler} size="md">
          Open Folder
        </Button>
      </div>
    </div>
  );
}
