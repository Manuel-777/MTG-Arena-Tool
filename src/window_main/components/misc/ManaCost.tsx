import React from "react";
import { COLORS_ALL } from "../../../shared/constants";

interface ManaCostProps {
  colors: number[];
  class?: string;
}

export default function ManaCost(props: ManaCostProps): JSX.Element {
  const { colors } = props;
  // Default to size 16px, Initially these had classes because "s" was for
  // shadowed mana costs, whereas no prefix was regular, non shadowed icon.
  // I supose these could be a set of props instead.
  const newclass = props.class ? props.class : "mana_s16";

  return (
    <>
      {colors.map((mana, index) => {
        return (
          <div
            key={mana + "_" + index}
            className={`${newclass} flex_end mana_${COLORS_ALL[mana - 1]}`}
          />
        );
      })}
    </>
  );
}
