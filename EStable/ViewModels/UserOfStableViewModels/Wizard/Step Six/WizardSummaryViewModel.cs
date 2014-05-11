using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepFour;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepThree;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.Step_Six
{
    public class WizardSummaryViewModel : BaseUserOfStableViewModel
    {
        public StableSummaryViewModel StableSummaryViewModel { get; set; }
        public ChargeTypesViewModel ChargeTypesViewModel { get; set; }
        public AnimalDetailsViewModel AnimalDetailsViewModel { get; set; }
        public List<string> OwnersViewModel { get; set; }
    }

    public class StableSummaryViewModel
    {
        public string TrainerName { get; set; }
        public string StableName { get; set; }
        public string StableLegalName { get; set; }
        public string Address { get; set; }
        public string PhoneNumber { get; set; }
        public string FaxNumber { get; set; }
        public string MobileNumber { get; set; }
        public string StableType { get; set; }

        public string GSTNumber { get; set; }
        public string GSTRate { get; set; }
        public string Effective { get; set; }
        public string PreviousRate { get; set; }
        public string NextInvoiceNumber { get; set; }
    }
}