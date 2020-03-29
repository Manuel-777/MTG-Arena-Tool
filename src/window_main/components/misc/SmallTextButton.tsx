import styled from "styled-components";
import { MetricText } from "./MetricText";

export const SmallTextButton = styled(MetricText).attrs(props => ({
  className: (props.className ?? "") + " button_simple"
}))`
  margin: 0 4px 5px 4px;
  width: 90px;
`;
