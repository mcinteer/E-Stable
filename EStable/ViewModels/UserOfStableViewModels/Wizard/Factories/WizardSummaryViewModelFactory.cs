using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models.Wizard;
using EStable.ViewModels.UserOfStableViewModels.Wizard.Step_Six;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.Factories
{
    public interface IWizardSummaryViewModelFactory
    {
        WizardSummaryViewModel ToViewModel(SummaryWizard wizard, string email);
    }
    public class WizardSummaryViewModelFactory : IWizardSummaryViewModelFactory
    {
        private readonly IChargeTypeViewModelFactory _chargeTypeViewModelFactory = new ChargeTypeViewModelFactory();
        private readonly IAnimalDetailsViewModelFactory _animalDetailsViewModelFactory = new AnimalDetailsViewModelFactory();

        public WizardSummaryViewModel ToViewModel(SummaryWizard wizard, string email)
        {
            var viewModel =  new WizardSummaryViewModel {Email = email};
            var contactInformation = wizard.ContactInformation;
            var financialInformation = wizard.FinancialInformation;
            viewModel.StableSummaryViewModel = new StableSummaryViewModel()
                {
                    //Contact info
                    Address = contactInformation.Address,
                    FaxNumber = contactInformation.Fax,
                    MobileNumber = contactInformation.Mobile,
                    PhoneNumber = contactInformation.Phone,
                    StableLegalName = contactInformation.LegalEntity,
                    TrainerName = contactInformation.Trainer,
                    StableType = contactInformation.StableType,
                    StableName = contactInformation.StableName,

                    //Financial info
                    Effective = financialInformation.GSTEffectiveDate,
                    GSTNumber = financialInformation.GSTNumber,
                    GSTRate = financialInformation.GSTRate,
                    NextInvoiceNumber = financialInformation.NextInvoiceNumber,
                    PreviousRate = financialInformation.PreviousGSTRate
                };

            viewModel.ChargeTypesViewModel = _chargeTypeViewModelFactory.ToViewModel(wizard.ChargeTypes);
            viewModel.AnimalDetailsViewModel = _animalDetailsViewModelFactory.ToViewModel(wizard.AnimalDetails);

            viewModel.OwnersViewModel =
                wizard.AnimalOwners.AnimalOwnerships
                    .SelectMany(ownership => ownership.WizardOwnership)
                        .Select(owner => owner.OwnerName).ToList();

            return viewModel;
        }
    }
}