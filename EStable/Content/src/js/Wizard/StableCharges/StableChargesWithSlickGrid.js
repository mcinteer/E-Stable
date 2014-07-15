$(function () {
	var stableCharges = {
		columns: [
			{
				name: 'Unit',
				field: 'Unit',
				id: 'unit',
				editor: Slick.Editors.Text
			},
			{
				name: 'In Stable',
				field:'InStable',
				id:'in-stable',
				editor: Slick.Editors.Text
			},
			{
				name: 'Description',
				field: 'Description',
				id: 'description',
				editor: Slick.Editors.Text
			},
			{
				name: 'Rate',
				field: 'Rate',
				id: 'rate',
				editor: Slick.Editors.Text
			}
		],
		rows: [
			{
				Unit: 'unit',
				InStable: 'in-stable',
				Description: 'description',
				Rate: 'rate'
			},
			{
				Unit: 'unit',
				InStable: 'in-stable',
				Description: 'description',
				Rate: 'rate'
			},
			{
				Unit: 'unit',
				InStable: 'in-stable',
				Description: 'description',
				Rate: 'rate'
			}
		],
		options: {
				editable: true,
				enableAddRow: false,
				enableCellNavigation: true,
				asyncEditorLoading: false
			},
		controller: {
			Initialize: function() {
				grid = new Slick.Grid('#slick-example', stableCharges.rows, stableCharges.columns, stableCharges.options);
			}
		}
	};

	stableCharges.controller.Initialize();
});