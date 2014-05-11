using EStable.Bouncers;
using EStable.Exceptions;
using EStable.Models;
using EStable.Security;
using Moq;
using NUnit.Framework;

namespace EStable.Tests.Bouncers
{
    [TestFixture]
    public class StableChargeBouncerTests
    {
        private StableChargeTypeBouncer _bouncer;
        private Mock<StableChargeTypeSecurity> _security;
        
        [SetUp]
        public void SetUp()
        {
            var user = new Mock<UserOfStablePortal>();
            _bouncer = new StableChargeTypeBouncer();
            _security = new Mock<StableChargeTypeSecurity>();
            _security.Setup(sec => sec.VerifyUserCanAddStableCharge(user.Object))
                .Throws(new NotAuthorizedToAddChargeTypeException());
        }

        [Test]
        public void ShouldThrowExpectedExceptionWhenUserIsNotAuthorized()
        {
            const string email = "tester@test.com";
            var expectedException = new NotAuthorizedToAddChargeTypeException();

            Assert.Throws<NotAuthorizedToAddChargeTypeException>(() => 
                _bouncer.SaveStableCharge(null, null, null, null, email));
        }
    }
}
