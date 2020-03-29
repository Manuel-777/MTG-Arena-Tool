import styled from "styled-components";

export const InputContainer = styled.div.attrs(props => ({
  className: (props.className ?? "") + " input_container"
}))`
  display: inline-flex;
  margin: inherit;
  position: relative;
  width: 100%;
  height: 26px;
  padding-bottom: 4px;
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &.input_container input {
    margin: 0;
    width: calc(100% - 10px);
    padding: 2px 4px;
    position: absolute;
    left: 0;
    right: 0;
  }
  &:hover input {
    color: rgba(255, 255, 255, 1);
    background-color: var(--color-mid-50);
    border: 1px solid var(--color-light);
  }
`;
