$(function () {
	var stableCharges = {
	    columns: [
	        {
	            name: 'Id',
	            field: 'Id',
	            id: 'id',
	            focusable: false,
	            sortable:true,
	            width: 0
	        },
			{
				name: 'Unit',
				field: 'Unit',
				id: 'unit',
				sortable: true,
				editor: Slick.Editors.Text
			},
			{
				name: 'In Stable',
				field:'InStable',
				id: 'in-stable',
				sortable: true,
				editor: Slick.Editors.Checkbox
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
		rows: JSON.parse($('#stableChargeObject').text()),
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
				return new Slick.Grid('#slick-example', stableCharges.rows, stableCharges.columns, stableCharges.options);
			},
			SubscribeToEvents: function(grid) {
			    this.SubscribeToOnAddNewRoadfunction(grid);
			    this.SubscribeToSaveStableChargesButton(grid);
			},
			SubscribeToSaveStableChargesButton: function (grid) {
			    $("#saveStableCharges").live('click', function () {
			        $.ajax({
			            type: "POST",
			            url: '../../../../../Wizard/SaveStableCharges',
			            data: {
			                chargeJson: JSON.stringify(grid.getData()),
			                email: $('#email').val()
			            },
			            success: function (data) {
			                grid.setData(data.records);
			                grid.render();
			            },
			            error: function (data) {
			                var test = '';
			            }
			        });
			    });
			},
			SubscribeToOnAddNewRoadfunction: function (grid) {
			    grid.onAddNewRow.subscribe(function (e, args) {
			        var stableCharge = {
			            Id: args.item.Id,
			            Unit: args.item.Unit || '',
			            Description: args.item.Description || '',
			            InStable: args.item.InStable || '',
			            Rate: args.item.Rate || ''
			        };

			        $.ajax({
			            type: "POST",
			            url: '../../../../../Wizard/AddNewStableCharge',
			            data: {
			                chargeJson: JSON.stringify(stableCharge),
			                email: $('#email').val()
			            },
			            success: function (data) {
			                grid.setData(data.records);
			                grid.render();
			            },
			            error: function (data) {
			                var test = '';
			            }
			        });
			    });
			}
		}
	};

	var stableChargesGrid = stableCharges.controller.CreateGrid();
	stableCharges.controller.SubscribeToEvents(stableChargesGrid);
});