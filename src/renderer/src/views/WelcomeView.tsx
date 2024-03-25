import { Onboarding } from '../components/Onboarding';
import useLibraryStore from '../stores/useLibraryStore';

export function WelcomeView() {
  const onOpen = useLibraryStore(state => state.onOpen);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Onboarding openHandler={onOpen} />
    </div>
  );
}
