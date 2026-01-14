// Chakra Imports
import { Box, Flex, useColorModeValue } from '@chakra-ui/react';
import PropTypes from 'prop-types';
import React, { useState, useEffect } from 'react';
import UserNavbarLinks from 'components/navbar/NavbarLinksUser';

export default function UserNavbar(props) {
	const [ scrolled, setScrolled ] = useState(false);

	useEffect(() => {
		window.addEventListener('scroll', changeNavbar);

		return () => {
			window.removeEventListener('scroll', changeNavbar);
		};
	});

	const { secondary } = props;

	// Here are all the props that may change depending on navbar's type or state.(secondary, variant, scrolled)
	let navbarPosition = 'fixed';
	let navbarFilter = 'none';
	let navbarBackdrop = 'blur(16px)';
	let navbarShadow = '0px 8px 24px rgba(15, 23, 42, 0.08)';
	let navbarBg = useColorModeValue('rgba(255, 255, 255, 0.9)', 'rgba(0, 0, 0, 0.7)');
	let navbarBorder = useColorModeValue('rgba(226, 232, 240, 0.7)', 'rgba(255,255,255,0.12)');
	let secondaryMargin = '0px';
	let paddingX = '10px';
	let gap = '0px';
	const changeNavbar = () => {
		if (window.scrollY > 1) {
			setScrolled(true);
		} else {
			setScrolled(false);
		}
	};

	return (
		<Box
			position={navbarPosition}
			boxShadow={navbarShadow}
			bg={navbarBg}
			borderColor={navbarBorder}
			filter={navbarFilter}
			backdropFilter={navbarBackdrop}
			backgroundPosition='center'
			backgroundSize='cover'
			borderRadius='999px'
			borderWidth='1px'
			borderStyle='solid'
			transitionDelay='0s, 0s, 0s, 0s'
			transitionDuration=' 0.25s, 0.25s, 0.25s, 0s'
			transitionProperty='box-shadow, background-color, filter, border'
			transitionTimingFunction='linear, linear, linear, linear'
			alignItems={{ xl: 'center' }}
			display={secondary ? 'block' : 'flex'}
			minH='52px'
			justifyContent={{ xl: 'center' }}
			lineHeight='25.6px'
			mx='auto'
			mt={secondaryMargin}
			pb='6px'
			right={{ base: '12px', md: '20px', lg: '24px', xl: '24px' }}
			px={{
				sm: paddingX,
				md: '12px'
			}}
			ps={{
				xl: '12px'
			}}
			pt='6px'
			top={{ base: '10px', md: '12px', lg: '14px', xl: '14px' }}
			w={{
				base: 'auto',
				md: 'auto',
				lg: 'auto',
				xl: 'auto',
				'2xl': 'auto'
			}}>
			<Flex
				w='100%'
				flexDirection={{
					sm: 'column',
					md: 'row'
				}}
				alignItems={{ xl: 'center' }}
				mb={gap}>
				<Box ms='auto' w='unset'>
					<UserNavbarLinks
						onOpen={props.onOpen}
						logoText={props.logoText}
						secondary={props.secondary}
						fixed={props.fixed}
						scrolled={scrolled}
					/>
				</Box>
			</Flex>
		</Box>
	);
}

UserNavbar.propTypes = {
	brandText: PropTypes.string,
	variant: PropTypes.string,
	secondary: PropTypes.bool,
	fixed: PropTypes.bool,
	onOpen: PropTypes.func
};
