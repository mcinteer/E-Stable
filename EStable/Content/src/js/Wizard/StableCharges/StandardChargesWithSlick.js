$(function() {
    var standardCharges = {
        columns: [
            {
                name: 'Id',
                field: 'Id',
                id: 'id',
                focusable: false,
                sortable: true,
                width: 0
            },
            {
                name: 'Description',
                field: 'Description',
                id: 'description',
                sortable: true,
                editor: Slick.Editors.Text
            },
            {
                name: 'Rate',
                field: 'Rate',
                id: 'rate',
                sortable: true,
                editor: Slick.Editors.Text
            }
        ],
        rows: JSON.parse($('#standardChargeData').text()),
        options: {
            editable: true,
            enableAddRow: true,
            enableCellNavigation: true,
            asyncEditorLoading: false,
            leaveSpaceForNewRows: true,
            forceFitColumns: true,
            syncColumnCellResize: true,
            multiColumnSort: true
        },
        controller: {
            CreateGrid: function() {
                return new Slick.Grid('#standard-charge-type', standardCharges.rows, standardCharges.columns, standardCharges.options);
            },
            SubscribeToEvents: function(grid) {
                this.SubscribeToOnAddNewRowFunction(grid);
                this.SubscribeToSaveStandardChargeButton(grid);
            },
            SubscribeToSaveStandardChargesButton: function(grid) {
                $('#saveStandardCharges').live('click', function() {
                    $.ajax({
                        type: 'POST',
                        url:'../../../../../wizard/SaveStandardCharges',
                        data: {
                            chargeJson: JSON.stringify(grid.getData()),
                            email: $('#email')
                        },
                        success: function(data) {
                            grid.setData(data.records);
                            grid.render();
                        }
                        error:function(data) {
                            var shefucked;
                        }
                    });
                });
            },
            SubscribeToOnAddNewRowFunction: function(grid) {
                grid.onAddNewRow.subscribe(function(e, args) {
                    var standardCharge = {
                        Id: args.item.Id,
                        Description: args.item.Description || '',
                        Rate: args.item.Rate || ''
                    };

                    $.ajax({
                        type: 'POST',
                        url: '../../../../../wizard/AddNewStandardCharge',
                        data: {
                            chargeJson: JSON.stringify(standardCharge),
                            email: $('#email').val()
                        },
                        success: function(data) {
                            grid.setData(data.records);
                            grid.render();
                        },
                        error: function(data) {
                            var shefucked;
                        }
                    });
                });
            }
        }
    }
    var standardChargesGrid = standardCharges.controller.CreateGrid();
    standardCharges.controller.SubscribeToEvents(standardChargesGrid);
});