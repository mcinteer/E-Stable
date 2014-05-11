using EStable.Models.Wizard;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepTwo;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.Factories
{
    public interface IFinancialInformationViewModelFactory
    {
        FinancialInformationViewModel ToViewModel(FinancialInformationWizard domain);
        FinancialInformationWizard ToDomainObject(FinancialInformationViewModel financialData);
    }

    public class FinancialInformationViewModelFactory :IFinancialInformationViewModelFactory
    {
        public FinancialInformationViewModel ToViewModel(FinancialInformationWizard domain)
        {
            return new FinancialInformationViewModel
                {
                    Email = domain.Email,
                    GSTEffectiveDate = domain.GSTEffectiveDate,
                    GSTNumber = domain.GSTNumber,
                    GSTRate = domain.GSTRate,
                    PreviousGSTRate = domain.PreviousGSTRate,
                    NextInvoiceNumber = domain.NextInvoiceNumber,
                    StableName = domain.StableName
                };
        }

        public FinancialInformationWizard ToDomainObject(FinancialInformationViewModel financialData)
        {
            return new FinancialInformationWizard()
                {
                    Email = financialData.Email,
                    StableName = financialData.StableName,
                    GSTNumber = financialData.GSTNumber,
                    GSTRate = financialData.GSTRate,
                    NextInvoiceNumber = financialData.NextInvoiceNumber,
                    GSTEffectiveDate = financialData.GSTEffectiveDate,
                    PreviousGSTRate = financialData.PreviousGSTRate
                };
        }
    }
}