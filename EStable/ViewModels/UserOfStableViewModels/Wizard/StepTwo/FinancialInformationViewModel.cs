using EStable.Models.Wizard;
using EStable.ViewModels.UserOfStableViewModels.Validation;
using FluentValidation.Attributes;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.StepTwo
{
    [Validator(typeof(FinancialInformationValidator))]
    public class FinancialInformationViewModel : BaseUserOfStableViewModel
    {
        public FinancialInformationViewModel(ContactInformationWizard contact) : base()
        {
            IsValid = true;
        }

        public FinancialInformationViewModel()
        {
            IsValid = true;
        }

        public string GSTNumber { get; set; }
        public string GSTRate { get; set; }
        public string NextInvoiceNumber { get; set; }
        public string GSTEffectiveDate { get; set; }
        public string PreviousGSTRate { get; set; }
    }
}