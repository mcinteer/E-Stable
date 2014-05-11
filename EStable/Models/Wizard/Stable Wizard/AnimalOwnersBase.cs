using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepFive;

namespace EStable.Models.Wizard.Stable_Wizard
{
    public class AnimalOwnersBase : StableWizardBase
    {
        public List<AnimalOwnership> AnimalOwnerships { get; set; }

        public void AddAnimalOwnership(AnimalOwnership ownership)
        {
            AnimalOwnerships.Add(ownership);
        }

        public void InitialiseAnimalOwnershipsFromAnimals(List<StableAnimal> stableAnimals)
        {
            foreach (var stableAnimal in stableAnimals)
            {
                var ownership = new AnimalOwnership()
                    {
                        AnimalName = stableAnimal.RacingName,
                        WizardOwnership = new List<WizardOwnership>()
                    };
                AddAnimalOwnership(ownership);
            }

        }
    }

    public class AnimalOwnership
    {
        public List<WizardOwnership> WizardOwnership { get; set; }
        public string AnimalName { get; set; }

        public AnimalOwnership()
        {
            WizardOwnership = new List<WizardOwnership>();
        }
        public AnimalOwnership(string animalName, string owner, string percentOwned, string invoiced, string ownerEmail, string syndicate, string syndicateName, string dayPhone, string nightPhone, string mobilePhone, string address)
        {
            WizardOwnership = WizardOwnership ?? new List<WizardOwnership>();
            AnimalName = animalName;
            var ownership = new WizardOwnership(owner, percentOwned, invoiced, ownerEmail, syndicate, syndicateName,
                                                dayPhone, nightPhone, mobilePhone, address);
            WizardOwnership.Add(ownership);
        }
    }

    public class WizardOwnership
    {
        public string OwnerName { get; set; }
        public string PercentOwned { get; set; }
        public string HasBeenInvoiced { get; set; }
        public string OwnerEmail { get; set; }
        public string IsSyndicate { get; set; }
        public string SyndicateName { get; set; }
        public string DayPhone { get; set; }
        public string NightPhone { get; set; }
        public string MobilePhone { get; set; }
        public string Address { get; set; }

        public WizardOwnership()
        {
            
        }
        public WizardOwnership(string owner, string percentOwned, string invoiced, string ownerEmail, string syndicate, string syndicateName, string dayPhone, string nightPhone, string mobilePhone, string address)
        {
            Address = address;
            DayPhone = dayPhone;
            HasBeenInvoiced = invoiced;
            IsSyndicate = syndicate;
            MobilePhone = mobilePhone;
            NightPhone = nightPhone;
            OwnerEmail = ownerEmail;
            OwnerName = owner;
            PercentOwned = percentOwned;
            SyndicateName = syndicateName;
        }
    }
}