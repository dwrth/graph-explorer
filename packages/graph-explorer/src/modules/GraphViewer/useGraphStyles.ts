import Color from "color";
import { useDeferredValue, useEffect, useState } from "react";
import {
  getEdgeIdFromRenderedEdgeId,
  RenderedEdgeId,
  useDisplayEdgesInCanvas,
} from "@/core";
import type { GraphProps } from "@/components";
import useTextTransform from "@/hooks/useTextTransform";
import { renderNode } from "./renderNode";
import {
  useEdgeTypeConfigs,
  useVertexTypeConfigs,
} from "@/core/ConfigurationProvider/useConfiguration";
import { MISSING_DISPLAY_VALUE } from "@/utils/constants";
import { useQueryClient } from "@tanstack/react-query";
import { useEdgeStylingContext } from "@/core/StateProvider/EdgeStylingContext";

const LINE_PATTERN = {
  solid: undefined,
  dashed: [5, 6],
  dotted: [1, 2],
};

const useGraphStyles = () => {
  const vtConfigs = useVertexTypeConfigs();
  const etConfigs = useEdgeTypeConfigs();
  const textTransform = useTextTransform();
  const [styles, setStyles] = useState<GraphProps["styles"]>({});
  const displayEdges = useDisplayEdgesInCanvas();
  const client = useQueryClient();
  const { allStyling } = useEdgeStylingContext();

  const deferredVtConfigs = useDeferredValue(vtConfigs);
  const deferredEtConfigs = useDeferredValue(etConfigs);

  useEffect(() => {
    (async () => {
      const styles: GraphProps["styles"] = {};

      for (const vtConfig of deferredVtConfigs) {
        const vt = vtConfig.type;

        // Process the image data or SVG
        const backgroundImage = await renderNode(client, vtConfig);

        styles[`node[type="${vt}"]`] = {
          "background-image": backgroundImage,
          "background-color": vtConfig.color,
          "background-opacity": vtConfig.backgroundOpacity,
          "border-color": vtConfig.borderColor,
          "border-width": vtConfig.borderWidth,
          "border-opacity": vtConfig.borderWidth ? 1 : 0,
          "border-style": vtConfig.borderStyle,
          shape: vtConfig.shape,
          width: 24,
          height: 24,
        };
      }

      for (const etConfig of deferredEtConfigs) {
        const et = etConfig?.type;

        // Get user styling preferences for this edge type
        const userEdgeStyle = allStyling.edges?.find(edge => edge.type === et);

        let label = textTransform(et);
        if (label.length > 20) {
          label = label.substring(0, 17) + "...";
        }

        styles[`edge[type="${et}"]`] = {
          label,
          "source-distance-from-node": 0,
          "target-distance-from-node": 0,
        };

        // Merge configuration with user styling preferences
        const mergedConfig = {
          ...etConfig,
          ...userEdgeStyle,
        };

        styles[`edge[type="${et}"]`] = {
          label: (el: cytoscape.EdgeSingular) => {
            const edgeId = el.id() as RenderedEdgeId;
            const displayEdge = displayEdges.get(
              getEdgeIdFromRenderedEdgeId(edgeId)
            );
            return displayEdge
              ? displayEdge.displayName
              : MISSING_DISPLAY_VALUE;
          },
          color: new Color(mergedConfig?.labelColor || "#17457b").isDark()
            ? "#FFFFFF"
            : "#000000",
          "line-color": mergedConfig.lineColor,
          "line-style":
            mergedConfig.lineStyle === "dotted"
              ? "dashed"
              : mergedConfig.lineStyle,
          "line-dash-pattern": mergedConfig.lineStyle
            ? LINE_PATTERN[mergedConfig.lineStyle]
            : undefined,
          "source-arrow-shape": mergedConfig.sourceArrowStyle,
          "source-arrow-color": mergedConfig.lineColor,
          "target-arrow-shape": mergedConfig.targetArrowStyle,
          "target-arrow-color": mergedConfig.lineColor,
          "text-background-opacity": mergedConfig?.labelBackgroundOpacity,
          "text-background-color": mergedConfig?.labelColor,
          "text-border-width": mergedConfig?.labelBorderWidth,
          "text-border-color": mergedConfig?.labelBorderColor,
          "text-border-style": mergedConfig?.labelBorderStyle,
          width: mergedConfig.lineThickness,
          "source-distance-from-node": 0,
          "target-distance-from-node": 0,
        };
      }

      setStyles(styles);
    })();
  }, [
    client,
    deferredEtConfigs,
    deferredVtConfigs,
    displayEdges,
    textTransform,
    allStyling,
  ]);

  return styles;
};

export default useGraphStyles;
