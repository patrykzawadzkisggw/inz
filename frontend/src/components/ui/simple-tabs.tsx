import * as React from 'react';
import { cn } from '@/lib/utils';


export interface SimpleTabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface SimpleTabsProps {
  tabs: SimpleTabItem[];
  defaultActiveId?: string;

  activeId?: string;
  onChange?: (id: string) => void;
  className?: string;
  listClassName?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  disabledTabClassName?: string;
  panelClassName?: string;
}

export const SimpleTabs: React.FC<SimpleTabsProps> = ({
  tabs,
  defaultActiveId,
  activeId,
  onChange,
  className,
  listClassName,
  tabClassName,
  activeTabClassName,
  disabledTabClassName,
  panelClassName,
}) => {
  const enabledTabs = React.useMemo(() => tabs.filter(t => !t.disabled), [tabs]);
  const firstEnabledId = enabledTabs[0]?.id;
  const isControlled = activeId !== undefined;
  const [internalActive, setInternalActive] = React.useState<string>(defaultActiveId || firstEnabledId);


  React.useEffect(() => {
    if (isControlled) return; 
    if (!internalActive || !tabs.some(t => t.id === internalActive && !t.disabled)) {
      setInternalActive(firstEnabledId);
    }
  }, [tabs, internalActive, firstEnabledId, isControlled]);

  const currentActiveId = isControlled ? activeId : internalActive;

  const setActive = (id: string) => {
    if (tabs.find(t => t.id === id)?.disabled) return;
    if (!isControlled) setInternalActive(id);
    onChange?.(id);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const currentIndex = enabledTabs.findIndex(t => t.id === currentActiveId);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % enabledTabs.length;
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
      e.preventDefault();
    } else if (e.key === 'Home') {
      nextIndex = 0; e.preventDefault();
    } else if (e.key === 'End') {
      nextIndex = enabledTabs.length - 1; e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
  
      return;
    } else return;

    const nextId = enabledTabs[nextIndex].id;
    setActive(nextId);
  
    const btn = document.querySelector<HTMLButtonElement>(`[data-tab-btn='${nextId}']`);
    btn?.focus();
  };

  return (
    <div className={cn('w-full', className)}>
      <ul
        role="tablist"
        className={cn(
          'flex flex-wrap text-sm font-medium text-center text-gray-500 dark:text-gray-400',
          listClassName
        )}
        onKeyDown={onKeyDown}
      >
        {tabs.map(tab => {
          const isActive = tab.id === currentActiveId && !tab.disabled;
          const baseClasses = 'inline-block px-4 py-3 rounded-lg transition-colors focus:outline-none focus-visible:ring focus-visible:ring-blue-500/50';
          const activeClasses = activeTabClassName || 'text-white bg-blue-600';
          const inactiveClasses = 'hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white';
          const disabledClasses = disabledTabClassName || 'text-gray-400 cursor-not-allowed dark:text-gray-500';

            return (
              <li key={tab.id} className="me-2 mb-2">
                <button
                  type="button"
                  role="tab"
                  data-tab-btn={tab.id}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  disabled={tab.disabled}
                  className={cn(
                    baseClasses,
                    tabClassName,
                    tab.disabled ? disabledClasses : (isActive ? activeClasses : inactiveClasses)
                  )}
                  onClick={() => setActive(tab.id)}
                >
                  {tab.label}
                </button>
              </li>
            );
        })}
      </ul>
      <div className="mt-4">
        {tabs.map(tab => {
          const isActive = tab.id === currentActiveId;
          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={`panel-${tab.id}`}
              aria-labelledby={`tab-${tab.id}`}
              hidden={!isActive}
              className={cn(isActive ? 'block' : 'hidden', panelClassName)}
            >
              {isActive && tab.content}
            </div>
          );
        })}
      </div>
    </div>
  );
};



export default SimpleTabs;
