import { FC } from "react";
import { Button } from "./ui/button";

export interface OnboardingProps {
  openHandler: () => void;
}

export const Onboarding: FC<OnboardingProps> = ({ openHandler }: OnboardingProps) => {
  return (
    <div className="w-full flex items-center justify-center">
      <div className="h-4/5 w-4/5 border border-solid border-teal-400 rounded outline-2 outline-dashed outline-teal-400 outline-offset-8 flex items-center justify-center">
        <Button onClick={openHandler} >
          Open Folder
        </Button>
      </div>
    </div>
  );
}
