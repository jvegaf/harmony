import styled from 'styled-components';

export const Container = styled.div`
  padding: 0;
  ${'' /* These styles are suggested for the table fill all available space in its containing element */}
  display: block;
  ${'' /* These styles are required for a horizontaly scrollable table overflow */}
  overflow: auto;

  .table {
    border-spacing: 0;

    .thead {
      ${'' /* These styles are required for a scrollable body to align with the header properly */}
      overflow-y: auto;
      overflow-x: hidden;
    }

    .tbody {
      ${'' /* These styles are required for a scrollable table body */}
      overflow-y: scroll;
      overflow-x: hidden;
    }

    .tr {
      :nth-child(even) {
        background-color: #23292b;
      }

      :nth-child(odd) {
        background-color: #2e3436;
      }

      :hover {
        background-color: #796868;
      }

      :last-child {
        .td {
          border-bottom: 0;
        }
      }

      &.isSelected {
        background-color: #967a7a;
      }

      &.isPlaying {
        background-color: #1793f8;
      }
    }

    .td {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: medium;
    }

    .th {
      background-color: #23292b;
      color: #eeeeee;
      font-size: small;
    }

    .th,
    .td {
      margin: 0;
      padding: 0.4rem 1rem;
      user-select: none;
      :first-child {
        padding: 0.4rem 0.5rem;
      }

      ${
  '' /* In this example we use an absolutely position resizer,
     so this is required. */
}
      position: relative;

      :last-child {
        border-right: 0;
      }

      .resizer {
        right: 0;
        background: #464849;
        width: 2px;
        height: 100%;
        position: absolute;
        top: 0;
        z-index: 1;
        ${'' /* prevents from scrolling while dragging on touch devices */}
        touch-action :none;

        &.isResizing {
          background: #5a878a;
        }
      }
    }
  }
`;
