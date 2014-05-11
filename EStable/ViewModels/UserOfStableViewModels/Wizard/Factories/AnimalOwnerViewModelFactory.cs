using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models;
using EStable.Models.Wizard;
using EStable.Models.Wizard.Stable_Wizard;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepFive;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.Factories
{
    public interface IAnimalOwnerViewModelFactory
    {
        AjaxStableOwnershipViewModel ToViewModel(IEnumerable<AnimalOwnership> animalOwnership, string email);
    }

    public class AnimalOwnerViewModelFactory : IAnimalOwnerViewModelFactory
    {
        public AjaxStableOwnershipViewModel ToViewModel(IEnumerable<AnimalOwnership> animalOwnership, string email)
        {
            var ownerships =  new AjaxStableOwnershipViewModel {Email = email};
            foreach (var ownership in animalOwnership)
            {
                var animalOwners = ownership.WizardOwnership.Select(ToViewModel).ToList();
                if (ownerships.AnimalOwnerships.ContainsKey(ownership.AnimalName))
                {
                    ownerships.AnimalOwnerships[ownership.AnimalName].AddRange(animalOwners);
                }
                else
                {
                    ownerships.AnimalOwnerships.Add(ownership.AnimalName, animalOwners);
                }
                
            }
            return ownerships;
        }

        private static AjaxAnimalOwnershipViewModel ToViewModel(WizardOwnership wizardOwnership)
        {
            return new AjaxAnimalOwnershipViewModel()
                {
                    Address = wizardOwnership.Address,
                    DayPhone = wizardOwnership.DayPhone,
                    HasBeenInvoiced = wizardOwnership.HasBeenInvoiced,
                    IsSyndicate = wizardOwnership.IsSyndicate,
                    MobilePhone = wizardOwnership.MobilePhone,
                    NightPhone = wizardOwnership.NightPhone,
                    OwnerEmail = wizardOwnership.OwnerEmail,
                    OwnerName = wizardOwnership.OwnerName,
                    PercentOwned = wizardOwnership.PercentOwned,
                    SyndicateName = wizardOwnership.SyndicateName
                };
        }
    }

    public interface IAjaxAnimalOwnerViewModelFactory
    {
        List<AjaxAnimalOwnershipViewModel> ToViewModel(AnimalOwnersBase animalOwners);
        List<AjaxAnimalOwnershipViewModel> ToViewModel(IEnumerable<AnimalOwnership> animalOwnership);
    }

    public class AjaxAnimalOwnerViewModelFactory : IAjaxAnimalOwnerViewModelFactory
    {
        public List<AjaxAnimalOwnershipViewModel> ToViewModel(AnimalOwnersBase animalOwners)
        {
            return animalOwners.AnimalOwnerships.Select(ToViewModel).ToList();
        }

        public List<AjaxAnimalOwnershipViewModel> ToViewModel(IEnumerable<AnimalOwnership> animalOwnership)
        {
            return animalOwnership.Select(ToViewModel).ToList();
        }

        private static AjaxAnimalOwnershipViewModel ToViewModel(AnimalOwnership animalOwnership)
        {
            var viewModel = new AjaxAnimalOwnershipViewModel()
            {
                AnimalName = animalOwnership.AnimalName
            };

            return animalOwnership.WizardOwnership.Aggregate(viewModel, ToViewModel);
        }

        private static AjaxAnimalOwnershipViewModel ToViewModel(AjaxAnimalOwnershipViewModel viewModel, WizardOwnership ownership)
        {
            viewModel.Address = ownership.Address;
            viewModel.DayPhone = ownership.DayPhone;
            viewModel.HasBeenInvoiced = ownership.HasBeenInvoiced;
            viewModel.IsSyndicate = ownership.IsSyndicate;
            viewModel.MobilePhone = ownership.MobilePhone;
            viewModel.NightPhone = ownership.NightPhone;
            viewModel.OwnerEmail = ownership.OwnerEmail;
            viewModel.OwnerName = ownership.OwnerName;
            viewModel.PercentOwned = ownership.PercentOwned;
            viewModel.SyndicateName = ownership.SyndicateName;
            return viewModel;
        }
    }
}