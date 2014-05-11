using EStable.Models;
using EStable.Models.Wizard;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard
{
    public class CreateAnimalViewModel
    {
        public StableAnimal StableAnimal { get; set; }
        public SummaryWizard Wizard { get; set; }
    }
}