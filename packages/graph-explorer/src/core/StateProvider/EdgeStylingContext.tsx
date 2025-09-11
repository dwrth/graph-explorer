import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import localForage from "localforage";
import { clone } from "lodash";
import { useAtom } from "jotai";
import { userStylingAtom } from "./userPreferences";

// Configure localForage
localForage.config({
  name: "ge",
  version: 1.0,
  storeName: "graph-explorer",
});

export type ShapeStyle =
  | "rectangle"
  | "roundrectangle"
  | "ellipse"
  | "triangle"
  | "pentagon"
  | "hexagon"
  | "heptagon"
  | "octagon"
  | "star"
  | "barrel"
  | "diamond"
  | "vee"
  | "rhomboid"
  | "tag"
  | "round-rectangle"
  | "round-triangle"
  | "round-diamond"
  | "round-pentagon"
  | "round-hexagon"
  | "round-heptagon"
  | "round-octagon"
  | "round-tag"
  | "cut-rectangle"
  | "concave-hexagon";
export type LineStyle = "solid" | "dashed" | "dotted";
export type ArrowStyle =
  | "triangle"
  | "triangle-tee"
  | "circle-triangle"
  | "triangle-cross"
  | "triangle-backcurve"
  | "tee"
  | "vee"
  | "square"
  | "circle"
  | "diamond"
  | "none";

export type EdgePreferences = {
  type: string;
  displayLabel?: string;
  displayNameAttribute?: string;
  labelColor?: string;
  labelBackgroundOpacity?: number;
  labelBorderColor?: string;
  labelBorderStyle?: LineStyle;
  labelBorderWidth?: number;
  labelOpacity?: string;
  lineColor?: string;
  lineThickness?: number;
  lineStyle?: LineStyle;
  sourceArrowStyle?: ArrowStyle;
  targetArrowStyle?: ArrowStyle;
};

export type UserStyling = {
  vertices?: Array<any>; // We only care about edges in this context
  edges?: Array<EdgePreferences>;
};

type UpdatedEdgeStyle = Omit<EdgePreferences, "type">;

interface EdgeStylingContextType {
  allStyling: UserStyling;
  setAllStyling: (updater: (prev: UserStyling) => UserStyling) => void;
  isLoading: boolean;
}

const EdgeStylingContext = createContext<EdgeStylingContextType | undefined>(
  undefined
);

interface EdgeStylingProviderProps {
  children: ReactNode;
}

export function EdgeStylingProvider({ children }: EdgeStylingProviderProps) {
  const [allStyling, setAllStylingState] = useState<UserStyling>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data from localForage
  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await localForage.getItem<UserStyling>("user-styling");
        if (stored) {
          setAllStylingState(stored);
        }
      } catch (error) {
        console.error("Failed to load edge styling data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Save to localForage whenever allStyling changes
  useEffect(() => {
    if (!isLoading) {
      localForage.setItem("user-styling", allStyling).catch(error => {
        console.error("Failed to save edge styling data:", error);
      });
    }
  }, [allStyling, isLoading]);

  const setAllStyling = useCallback(
    (updater: (prev: UserStyling) => UserStyling) => {
      setAllStylingState(prev => {
        // Shallow clone so React re-renders properly
        const cloned = clone(prev);
        return updater(cloned);
      });
    },
    []
  );

  const value: EdgeStylingContextType = {
    allStyling,
    setAllStyling,
    isLoading,
  };

  return (
    <EdgeStylingContext.Provider value={value}>
      {children}
    </EdgeStylingContext.Provider>
  );
}

export function useEdgeStylingContext() {
  const context = useContext(EdgeStylingContext);
  if (context === undefined) {
    throw new Error(
      "useEdgeStylingContext must be used within an EdgeStylingProvider"
    );
  }
  return context;
}

/**
 * Provides the necessary functions for managing edge styles.
 *
 * @param type The edge type
 * @returns The edge style if it exists, an update function, and a reset function
 */
export function useEdgeStyling(type: string) {
  const { allStyling, setAllStyling } = useEdgeStylingContext();

  const edgeStyle = allStyling.edges?.find(v => v.type === type);

  const setEdgeStyle = (updatedStyle: UpdatedEdgeStyle) => {
    setAllStyling(prev => {
      const hasEntry = prev.edges?.some(v => v.type === type);
      if (hasEntry) {
        // Update the existing entry, merging the updates with the existing style
        prev.edges = prev.edges?.map(existing => {
          if (existing.type === type) {
            return {
              ...existing,
              ...updatedStyle,
            };
          }
          return existing;
        });
      } else {
        // Add the new entry
        prev.edges = (prev.edges ?? []).concat({
          type,
          ...updatedStyle,
        });
      }

      return prev;
    });
  };

  const resetEdgeStyle = () =>
    setAllStyling(prev => {
      prev.edges = prev.edges?.filter(v => v.type !== type);
      return prev;
    });

  return {
    edgeStyle,
    setEdgeStyle,
    resetEdgeStyle,
  };
}

/**
 * Hook to get all user styling data, combining both vertex and edge styling
 * This is used to bridge the context-based edge styling with the Jotai-based configuration system
 */
export function useAllUserStyling() {
  const { allStyling } = useEdgeStylingContext();
  const [vertexStyling] = useAtom(userStylingAtom);

  return {
    vertices: vertexStyling.vertices,
    edges: allStyling.edges,
  };
}

/**
 * Hook that provides the merged configuration with context-based edge styling
 * This is used by components that need the full configuration including user styling
 */
export function useMergedConfigurationWithEdgeStyling() {
  const { allStyling } = useEdgeStylingContext();
  const [vertexStyling] = useAtom(userStylingAtom);

  // Combine both styling systems
  const combinedUserStyling = {
    vertices: vertexStyling.vertices,
    edges: allStyling.edges,
  };

  // This would need to be called from a component that has access to the configuration
  // For now, we'll return the combined styling
  return combinedUserStyling;
}
