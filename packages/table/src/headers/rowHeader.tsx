/*
 * Copyright 2016 Palantir Technologies, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import classNames from "classnames";
import * as React from "react";

import * as Classes from "../common/classes";
import type { RowIndices } from "../common/grid";
import type { ClientCoordinates } from "../interactions/dragTypes";
import type { IndexedResizeCallback } from "../interactions/resizable";
import { Orientation } from "../interactions/resizeHandle";
import { RegionCardinality, Regions } from "../regions";

import { Header, type HeaderProps } from "./header";
import { RowHeaderCell, type RowHeaderCellProps } from "./rowHeaderCell";

export type RowHeaderRenderer = (rowIndex: number) => React.ReactElement<RowHeaderCellProps>;

export interface RowHeights {
    minRowHeight: number;
    maxRowHeight: number;
    defaultRowHeight: number;
}

export interface RowHeaderProps extends HeaderProps, RowHeights, RowIndices {
    /**
     * A callback invoked when user is done resizing the column
     */
    onRowHeightChanged: IndexedResizeCallback;

    /**
     * Renders the cell for each row header
     */
    rowHeaderCellRenderer?: RowHeaderRenderer;

    /**
     * Called on component mount.
     */
    onMount?: (whichHeader: "column" | "row") => void;
}

export class RowHeader extends React.Component<RowHeaderProps> {
    public static defaultProps = {
        rowHeaderCellRenderer: renderDefaultRowHeader,
    };

    public componentDidMount() {
        this.props.onMount?.("row");
    }

    public render() {
        const {
            // from RowHeaderProps
            onRowHeightChanged,
            rowHeaderCellRenderer,

            // from RowHeights
            minRowHeight: minSize,
            maxRowHeight: maxSize,
            defaultRowHeight,

            // from RowIndices
            rowIndexStart: indexStart,
            rowIndexEnd: indexEnd,

            // from HeaderProps
            ...spreadableProps
        } = this.props;

        return (
            <Header
                convertPointToIndex={this.convertPointToRow}
                fullRegionCardinality={RegionCardinality.FULL_ROWS}
                getCellExtremaClasses={this.getCellExtremaClasses}
                getCellIndexClass={Classes.rowCellIndexClass}
                getCellSize={this.getRowHeight}
                getDragCoordinate={this.getDragCoordinate}
                getIndexClass={Classes.rowIndexClass}
                getMouseCoordinate={this.getMouseCoordinate}
                ghostCellRenderer={this.renderGhostCell}
                handleResizeEnd={this.handleResizeEnd}
                handleSizeChanged={this.handleSizeChanged}
                headerCellIsReorderablePropName={"enableRowReordering"}
                headerCellIsSelectedPropName={"isRowSelected"}
                headerCellRenderer={rowHeaderCellRenderer!}
                indexEnd={indexEnd}
                indexStart={indexStart}
                isCellSelected={this.isCellSelected}
                isGhostIndex={this.isGhostIndex}
                maxSize={maxSize}
                minSize={minSize}
                resizeOrientation={Orientation.HORIZONTAL}
                selectedRegions={[]}
                toRegion={this.toRegion}
                wrapCells={this.wrapCells}
                {...spreadableProps}
            />
        );
    }

    private wrapCells = (cells: Array<React.ReactElement<any>>) => {
        const { rowIndexStart, grid } = this.props;

        const tableHeight = grid.getRect().height;
        const scrollTopCorrection = this.props.grid.getCumulativeHeightBefore(rowIndexStart);
        const style: React.CSSProperties = {
            // reduce the height to clamp the sliding window as we approach the final headers; otherwise,
            // we'll have tons of useless whitespace at the end.
            height: tableHeight - scrollTopCorrection,
            // only header cells in view will render, but we need to reposition them to stay in view
            // as we scroll vertically.
            transform: `translateY(${scrollTopCorrection || 0}px)`,
        };

        // add a wrapper set to the full-table height to ensure container styles stretch from the first
        // cell all the way to the last
        return (
            <div style={{ height: tableHeight }}>
                <div className={Classes.TABLE_ROW_HEADERS_CELLS_CONTAINER} style={style}>
                    {cells}
                </div>
            </div>
        );
    };

    private convertPointToRow = (clientXOrY: number, useMidpoint?: boolean) => {
        return this.props.locator?.convertPointToRow(clientXOrY, useMidpoint);
    };

    private getCellExtremaClasses = (index: number, indexEnd: number) => {
        return this.props.grid.getExtremaClasses(index, 0, indexEnd, 1);
    };

    private getRowHeight = (index: number) => {
        return this.props.grid.getRowRect(index).height;
    };

    private getDragCoordinate = (clientCoords: ClientCoordinates) => {
        return clientCoords[1]; // y-coordinate
    };

    private getMouseCoordinate = (event: MouseEvent) => {
        return event.clientY;
    };

    private handleResizeEnd = (index: number, size: number) => {
        this.props.onResizeGuide(null);
        this.props.onRowHeightChanged(index, size);
    };

    private handleSizeChanged = (index: number, size: number) => {
        const rect = this.props.grid.getRowRect(index);
        this.props.onResizeGuide([rect.top + size]);
    };

    private isCellSelected = (index: number) => {
        return Regions.hasFullRow(this.props.selectedRegions!, index);
    };

    private isGhostIndex = (index: number) => {
        return this.props.grid.isGhostIndex(index, -1);
    };

    private renderGhostCell = (index: number, extremaClasses: string[]) => {
        const rect = this.props.grid.getGhostCellRect(index, 0);
        return (
            <RowHeaderCell
                className={classNames(extremaClasses)}
                index={index}
                key={Classes.rowIndexClass(index)}
                loading={this.props.loading}
                style={{ height: `${rect.height}px` }}
            />
        );
    };

    private toRegion = (index1: number, index2?: number) => {
        // the `this` value is messed up for Regions.row, so we have to have a wrapper function here
        return Regions.row(index1, index2);
    };
}

/**
 * A default implementation of `RowHeaderRenderer` that displays 1-indexed
 * numbers for each row.
 */
export function renderDefaultRowHeader(rowIndex: number) {
    return <RowHeaderCell index={rowIndex} name={`${rowIndex + 1}`} />;
}
